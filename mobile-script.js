const radioStatusMessage = document.getElementById('radioStatusMessage');
const loadingMessage = document.getElementById('loadingMessage');
const playButton = document.getElementById('playButton');
const stopButton = document.getElementById('stopButton');
const refreshButton = document.getElementById('refreshButton');
const infoButton = document.getElementById('infoButton');
const audio = document.getElementById('audio');
const radioLogo = document.getElementById('radioLogo');
const songInfo = document.getElementById('songInfo');

let audioCtx = null;
let audioInitialized = false;

let eventSource = null;
let lastSongTitle = '';

// --- FUNCIÓN: Obtener metadatos de Zeno Radio con EventSource ---
function connectToMetadataStream() {
    if (eventSource) {
        eventSource.close();
    }
    
    // URL de la API de metadatos SSE de Zeno.fm
    const metadataUrl = 'https://api.zeno.fm/mounts/metadata/subscribe/udgoxuccigfuv';
    eventSource = new EventSource(metadataUrl);

    eventSource.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            if (data && data.streamTitle) {
                const newSongTitle = data.streamTitle;
                
                if (lastSongTitle !== newSongTitle) {
                    songInfo.textContent = newSongTitle;
                    songInfo.style.opacity = '1';
                    console.log('Metadatos actualizados:', newSongTitle);
                    lastSongTitle = newSongTitle;
                }
            } else {
                console.warn('No se encontraron metadatos válidos en el evento.');
            }
        } catch (error) {
            console.error('Error al parsear el JSON de metadatos:', error);
        }
    };
    
    eventSource.onerror = function(error) {
        console.error('Error en la conexión de EventSource:', error);
        songInfo.textContent = 'Error al cargar metadatos';
        songInfo.style.opacity = '0';
        eventSource.close();
    };
}


function initAudio() {
  console.log('initAudio: Iniciando o reanudando AudioContext.');
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (loadingMessage) {
    loadingMessage.textContent = 'Espera unos segundos xfa';
    loadingMessage.style.display = 'block';
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => {
      console.log('AudioContext reanudado.');
      playAudioAndSetup();
    }).catch(e => {
      console.error("Error al reanudar AudioContext:", e);
      if (loadingMessage) loadingMessage.style.display = 'none';
    });
  } else {
    playAudioAndSetup();
  }
}

function playAudioAndSetup() {
    audio.play().then(() => {
        console.log("playAudioAndSetup: Audio reproduciéndose. AudioContext state:", audioCtx.state);
        audioInitialized = true;
        playButton.style.display = 'none';
        stopButton.style.display = 'inline-block';

        radioLogo.classList.add('playing');

        radioStatusMessage.style.display = 'none';
        radioStatusMessage.textContent = '';
        if (loadingMessage) loadingMessage.style.display = 'none';
        
        connectToMetadataStream();

    }).catch(e => {
        console.error("playAudioAndSetup: Error al reproducir audio:", e);
        radioStatusMessage.textContent = 'Error al iniciar la radio (requiere interacción).';
        radioStatusMessage.style.display = 'block';
        playButton.style.display = 'inline-block';
        stopButton.style.display = 'none';
        if (loadingMessage) loadingMessage.style.display = 'none';
    });
}

function stopAudio() {
  console.log('stopAudio: Deteniendo audio.');
  audio.pause();
  audio.currentTime = 0;
  radioStatusMessage.textContent = 'Radio Detenida';
  radioStatusMessage.style.display = 'block';
  playButton.style.display = 'inline-block';
  stopButton.style.display = 'none';
  audioInitialized = false;
  radioLogo.classList.remove('playing');
  if (loadingMessage) loadingMessage.style.display = 'none';

  if (audioCtx && audioCtx.state === 'running') {
      audioCtx.suspend().then(() => console.log('AudioContext suspendido.'));
  }
  
  songInfo.style.opacity = '0';
  if (eventSource) {
      eventSource.close();
      eventSource = null;
  }
}

function togglePlayPause() {
    if (audio.paused) {
        initAudio();
    } else {
        stopAudio();
    }
}

function refreshPage() {
    console.log('Recargando página.');
    location.reload();
}

function openInfoPage() {
    console.log('Botón de información clickeado. Deteniendo audio y abriendo página de ZenoRadio.');
    stopAudio();
    window.open('https://zeno.fm/radio/total-music-radio-q7yv/', '_blank');
}

// Inicializar listeners
document.addEventListener('DOMContentLoaded', (event) => {
    console.log('DOMContentLoaded: DOM completamente cargado.');
    radioStatusMessage.style.display = 'none';
    if (loadingMessage) loadingMessage.style.display = 'none';

    playButton.style.display = 'inline-block';
    stopButton.style.display = 'none';

    playButton.addEventListener('click', initAudio);
    stopButton.addEventListener('click', stopAudio);
    refreshButton.addEventListener('click', refreshPage);
    infoButton.addEventListener('click', openInfoPage);

    radioLogo.addEventListener('click', function() {
        if (audioInitialized) {
            togglePlayPause();
        } else {
            initAudio();
        }
    });
});