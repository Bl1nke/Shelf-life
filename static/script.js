// script.js — камера + управление кнопками

// ==========================================
// МОДУЛЬ КАМЕРЫ
// ==========================================

const Camera = (function() {

    let stream = null;
    let video = null;
    let canvas = null;

    function init(videoId = 'camera-video') {
        video = document.getElementById(videoId);
        canvas = document.createElement('canvas');
    }

    async function start(facingMode = 'environment') {
        stop();

        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            });

            if (video) {
                video.srcObject = stream;
                video.playsInline = true;
                await video.play();
            }

            return stream;
        } catch (err) {
            throw new Error(formatError(err));
        }
    }

    function stop() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        if (video) {
            video.srcObject = null;
        }
    }

    async function switchFacing() {
        if (!stream) return;

        const currentTrack = stream.getVideoTracks()[0];
        const currentFacing = currentTrack.getSettings().facingMode;
        const newFacing = currentFacing === 'user' ? 'environment' : 'user';

        stop();
        return await start(newFacing);
    }

    function capture(options = {}) {
        if (!video || !video.videoWidth) return null;

        const quality = options.quality || 0.9;
        const format = options.format === 'png' ? 'image/png' : 'image/jpeg';

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');

        if (stream) {
            const track = stream.getVideoTracks()[0];
            if (track && track.getSettings().facingMode === 'user') {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            }
        }

        ctx.drawImage(video, 0, 0);

        const dataUrl = canvas.toDataURL(format, quality);
        const blob = dataUrlToBlob(dataUrl);

        return { blob, dataUrl, canvas };
    }

    function captureAsFile(filename = 'check.jpg', options = {}) {
        const result = capture(options);
        if (!result) return null;

        return new File([result.blob], filename, { type: result.blob.type });
    }

    function dataUrlToBlob(dataUrl) {
        const parts = dataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)[1];
        const bytes = atob(parts[1]);
        const buffer = new Uint8Array(bytes.length);

        for (let i = 0; i < bytes.length; i++) {
            buffer[i] = bytes.charCodeAt(i);
        }

        return new Blob([buffer], { type: mime });
    }

    function formatError(err) {
        if (err.name === 'NotAllowedError') {
            return 'Доступ к камере запрещён. Разрешите его в настройках браузера.';
        }
        if (err.name === 'NotFoundError') {
            return 'Камера не найдена на устройстве.';
        }
        if (err.name === 'NotReadableError') {
            return 'Камера занята другим приложением.';
        }
        return 'Не удалось открыть камеру: ' + err.message;
    }

    return {
        init,
        start,
        stop,
        capture,
        captureAsFile,
        switchFacing
    };

})();

// ==========================================
// УПРАВЛЕНИЕ КНОПКАМИ И МОДАЛКОЙ
// ==========================================

Camera.init('camera-video');

function openModal() {
    document.getElementById('modal').style.display = 'flex';
    Camera.start().catch(err => {
        alert(err.message);
        closeModal();
    });
}

function closeModal() {
    Camera.stop();
    document.getElementById('modal').style.display = 'none';
}

document.getElementById('capture-btn').addEventListener('click', () => {
    const file = Camera.captureAsFile();
    Camera.stop();
    document.getElementById('modal').style.display = 'none';

    console.log('Фото готово:', file);
    // Здесь передача в другой модуль
});

document.getElementById('switch-btn').addEventListener('click', () => {
    Camera.switchFacing().catch(err => alert(err.message));
});