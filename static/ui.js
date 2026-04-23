// Дарья, здесь храниться логика, того как открываются новые кнопки и появляется списки, также твоя часть, часть майкла в другом файле
// Ключ для сохранения данных в браузере
const STORAGE_KEY = 'shelf_life_products';

// Загружаем продукты из памяти или создаем пустой массив
let products = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

// Сохраняем текущий список в память браузера
function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

// Функция расчета дней до истечения срока
function getDaysLeft(dateString) {
    const today = new Date();
    // Сбрасываем время (часы/минуты) у обоих дат для точности сравнения дней
    today.setHours(0, 0, 0, 0);
    
    const expiryDate = new Date(dateString);
    
    // Разница в миллисекундах
    const diffTime = expiryDate - today;
    
    // Переводим в дни
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
}

// Определяем CSS класс в зависимости от количества дней
function getStatusClass(days) {
    if (days < 0) return 'expired';      // Истекло (серый)
    if (days <= 3) return 'danger';      // Критично (красный)
    if (days <= 7) return 'warn';        // Скоро (оранжевый)
    return 'ok';                         // Норма (зеленый)
}

// Главная функция отрисовки списка
function renderList() {
    const listContainer = document.getElementById('list');
    listContainer.innerHTML = ''; // Очищаем текущий список

    products.forEach((product, index) => {
        const daysLeft = getDaysLeft(product.date);
        const statusClass = getStatusClass(daysLeft);

        // Форматируем дату красиво (день.месяц.год)
        const formattedDate = new Date(product.date).toLocaleDateString('ru-RU');

        // Создаем HTML для одного товара
        const itemHTML = `
            <div class="item">
                <div class="product-info">
                    <div class="name">${product.name}</div>
                    <div class="date ${statusClass}">Срок: ${formattedDate}</div>
                </div>
                <div class="product-actions">
                    <span class="days ${statusClass}">${daysLeft} дн.</span>
                    <button class="del" onclick="removeProduct(${index})">×</button>
                </div>
            </div>
        `;

        // Добавляем в DOM
        listContainer.insertAdjacentHTML('beforeend', itemHTML);
    });
}

// Добавление нового товара в массив
function addProduct(name, date) {
    products.unshift({ name: name, date: date }); // Добавляем в начало списка
    saveData();
    renderList();
}

// Удаление товара по индексу
function removeProduct(index) {
    products.splice(index, 1); // Удаляем 1 элемент по индексу
    saveData();
    renderList();
}

// --- Управление модальным окном ---

function openModal() {
    document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

// Функция "Фейкового" сканирования (для теста)
function mockScan() {
    // Получаем текущую дату для генерации тестовых сроков
    const today = new Date();

    // Вспомогательная функция для получения даты с отступом
    const getDateByOffset = (daysOffset) => {
        const d = new Date(today);
        d.setDate(d.getDate() + daysOffset);
        return d.toISOString().split('T')[0]; // Возвращаем формат YYYY-MM-DD
    };

    // Добавляем 3 тестовых товара
    addProduct('Молоко 3.2%', getDateByOffset(4));      // Останется 4 дня (оранжевый)
    addProduct('Шоколад Алёнка', getDateByOffset(45));   // Останется 45 дней (зеленый)
    addProduct('Кефир Якорный', getDateByOffset(1));     // Останется 1 день (красный)

    closeModal();
}

// --- Инициализация при загрузке страницы ---

document.addEventListener('DOMContentLoaded', () => {
    renderList();
});

// Закрытие модального окна при клике вне его области
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target == modal) {
        closeModal();
    }
}