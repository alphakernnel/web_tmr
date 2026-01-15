const audio = document.getElementById('audio');
const playButton = document.getElementById('playButton');
const stopButton = document.getElementById('stopButton');
const radioLogo = document.getElementById('radioLogo');
const songInfo = document.getElementById('songInfo');
const liveIndicator = document.getElementById('liveIndicator');
const statusText = document.getElementById('statusText');
const shareButton = document.getElementById('shareButton');

let isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
let wakeLock = null;
let eventSource = null;

// --- GESTIÓN DE AUDIO Y ESTADO LIVE ---
async function initAudio() {
    try {
        await audio.play();
        updateUI(true);
        if (isMobile) requestWakeLock();
    } catch (err) { console.error("Error audio:", err); }
}

function stopAudio() {
    audio.pause();
    audio.src = audio.src;
    updateUI(false);
    if (wakeLock) { wakeLock.release(); wakeLock = null; }
}

function updateUI(isPlaying) {
    playButton.style.display = isPlaying ? 'none' : 'inline-block';
    stopButton.style.display = isPlaying ? 'inline-block' : 'none';
    radioLogo.classList.toggle('playing', isPlaying);
    
    // Cambio de estado ON AIR
    if (isPlaying) {
        liveIndicator.classList.replace('offline', 'online');
        statusText.innerText = "AL AIRE - EN VIVO";
    } else {
        liveIndicator.classList.replace('online', 'offline');
        statusText.innerText = "RADIO DETENIDA";
    }
}

// --- METADATA REFORZADA ---
function connectMetadata() {
    if (eventSource) eventSource.close();

    const streamId = 'udgoxuccigfuv';
    // Forzamos la conexión limpia
    eventSource = new EventSource(`https://api.zeno.fm/mounts/metadata/subscribe/${streamId}`);

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data && data.streamTitle) {
            songInfo.innerText = data.streamTitle;
            document.title = `TMR: ${data.streamTitle}`;
        }
    };

    eventSource.onerror = () => {
        eventSource.close();
        setTimeout(connectMetadata, 3000);
    };
}

// --- FUNCIÓN COMPARTIR ---
shareButton.addEventListener('click', () => {
    const text = `¡Escucha Total Music Radio! 🤘 Ahora suena: ${songInfo.innerText}`;
    const url = window.location.href;

    if (navigator.share) {
        navigator.share({ title: 'Total Music Radio', text: text, url: url });
    } else {
        // Fallback para navegadores que no soportan Share API (PC)
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text + " " + url)}`, '_blank');
    }
});

// ... (Aquí incluirías la lógica de Three.js que ya teníamos para PC) ...

document.addEventListener('DOMContentLoaded', () => {
    connectMetadata();
    // Inicializar visualizador solo en PC
    if(!isMobile && typeof initStars === 'function') initStars(); 
});

playButton.addEventListener('click', initAudio);
stopButton.addEventListener('click', stopAudio);
document.getElementById('refreshButton').addEventListener('click', () => location.reload());