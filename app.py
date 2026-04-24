import os
import json
import base64
import re
from datetime import datetime, timedelta
from io import BytesIO
from flask import Flask, request, jsonify, render_template
import pytesseract
from PIL import Image
from thefuzz import fuzz, process

app = Flask(__name__)

# Загрузка базы данных
DB_PATH = 'storage_db.json'
if not os.path.exists(DB_PATH):
    raise FileNotFoundError(f"Файл {DB_PATH} не найден.")

with open(DB_PATH, 'r', encoding='utf-8') as f:
    products_db = json.load(f)

# Подготовка данных для быстрого поиска
product_names = [p['name'] for p in products_db]
product_lookup = {p['name']: p for p in products_db}

def normalize_line(line: str) -> str:
    """Базовая очистка строки от шума и типичных OCR-ошибок"""
    line = line.lower().strip()
    # Замена частых оптических ошибок (0→о, 3→з, 1→и, 6→б, 8→в, 5→с)
    line = line.replace('0', 'о').replace('3', 'з').replace('1', 'и').replace('6', 'б').replace('8', 'в').replace('5', 'с')
    # Убираем всё, кроме букв, цифр и пробелов
    line = re.sub(r'[^\w\sа-яё]', '', line)
    # Удаляем лишние пробелы
    line = re.sub(r'\s+', ' ', line).strip()
    return line

def extract_text_from_image(image_bytes):
    image = Image.open(BytesIO(image_bytes))
    image = image.convert('L')  # Градации серого
    # Путь к tesseract можно указать явно, если не в PATH
    return pytesseract.image_to_string(image, lang='rus+eng')

def parse_products_from_text(text, threshold=70):
    """Парсинг чека с использованием нечёткого поиска"""
    lines = text.strip().split('\n')
    found_products = []
    today = datetime.now().date()
    matched_names = set()

    # Ключевые слова, которые точно не являются продуктами
    stop_words = {'итого', 'сдача', 'оплата', 'чек', 'дата', 'время', 'номер', 
                  'касса', 'кассир', 'акция', 'скидка', 'фул', 'фулфил', 'кредит'}

    for line in lines:
        raw_line = line.strip()
        if len(raw_line) < 3:
            continue

        # Быстрая фильтрация мусора
        lower_line = raw_line.lower()
        if any(kw in lower_line for kw in stop_words):
            continue
        
        # Отсев строк, состоящих только из цифр/цен
        cleaned = re.sub(r'[\s₽руб.,\-]', '', raw_line)
        if cleaned.isdigit():
            continue

        # Нормализация для сравнения
        norm_line = normalize_line(raw_line)
        if not norm_line:
            continue

        # Нечёткое сопоставление
        best_match, score = process.extractOne(norm_line, product_names, scorer=fuzz.partial_ratio)
        
        if score >= threshold:
            prod = product_lookup[best_match]
            if best_match not in matched_names:
                matched_names.add(best_match)
                exp_date = today + timedelta(days=prod['shelf_life_days'])
                found_products.append({
                    'name': prod['name'],
                    'expiration_date': exp_date.strftime('%d.%m.%Y'),
                    'shelf_life_days': prod['shelf_life_days'],
                    'confidence': score  # Полезно для отладки
                })

    return found_products

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/scan', methods=['POST'])
def scan_receipt():
    try:
        data = request.get_json()
        if not data or 'image_base64' not in data:
            return jsonify({'status': 'error', 'message': 'Изображение не передано'}), 400

        b64_string = data['image_base64']
        if ',' in b64_string:
            b64_string = b64_string.split(',')[1]

        image_bytes = base64.b64decode(b64_string)
        text = extract_text_from_image(image_bytes)
        products = parse_products_from_text(text, threshold=70)

        return jsonify({
            'status': 'success', 
            'products': products, 
            'raw_text': text
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    # Если Tesseract не в PATH, раскомментируйте:
    # pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    app.run(debug=True, host='0.0.0.0', port=5000)