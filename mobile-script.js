const radioStatusMessage = document.getElementById('radioStatusMessage');
const loadingMessage = document.getElementById('loadingMessage');
const audio = document.getElementById('audio');

// NUEVA REFERENCIA: El botón transparente que funciona como Play/Stop
const centralPlayTarget = document.getElementById('centralPlayTarget'); 

const songInfo = document.getElementById('songInfo');
const refreshButton = document.getElementById('refreshButton');
const infoButton = document.getElementById('infoButton');

let audioCtx = null;
let source; 
let audioInitialized = false;
let wakeLock = null;

let eventSource = null;
let lastSongTitle = '';

// --- Funciones para la Wake Lock API ---
async function requestWakeLock() {
    console.log('Intentando solicitar wake lock...');
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
            console.log('Wake Lock ha sido liberado.');
        });
        console.log('¡Wake Lock activado!');
    } catch (err) {
        console.error(`Error al solicitar el wake lock: ${err.name}, ${err.message}`);
    }
}

function releaseWakeLock() {
    console.log('Liberando wake lock...');
    if (wakeLock) {
        wakeLock.release()
            .then(() => {
                wakeLock = null;
                console.log('Wake Lock liberado con éxito.');
            })
            .catch(err => {
                console.error(`Error al liberar el wake lock: ${err.name}, ${err.message}`);
            });
    }
}

document.addEventListener('visibilitychange', () => {
    if (wakeLock !== null && document.visibilityState === 'visible' && !audio.paused) {
        console.log('Página visible y audio reproduciéndose. Re-solicitando wake lock.');
        requestWakeLock();
    }
});
// --- Fin Funciones para la Wake Lock API ---

// --- Obtener metadatos de Zeno Radio con EventSource ---
function connectToMetadataStream() {
    if (eventSource) {
        eventSource.close();
    }
    
    const metadataUrl = 'https://api.zeno.fm/mounts/metadata/subscribe/udgoxuccigfuv';
    eventSource = new EventSource(metadataUrl);

    eventSource.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            if (data && data.streamTitle) {
                const newSongTitle = data.streamTitle;
                
                if (lastSongTitle !== newSongTitle) {
                    let displayTitle = newSongTitle;
                    const separatorIndex = newSongTitle.indexOf(' - ');
                    
                    if (separatorIndex !== -1) {
                        const artist = newSongTitle.substring(0, separatorIndex).trim();
                        const title = newSongTitle.substring(separatorIndex + 3).trim();
                        displayTitle = `${artist}<br>${title}`;
                    }
                    
                    songInfo.innerHTML = displayTitle;
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
        songInfo.innerHTML = 'Error al cargar metadatos';
        songInfo.style.opacity = '0';
        eventSource.close();
    };
}


// Función mejorada con async/await para el flujo de audio
async function initAudio() {
  console.log('initAudio: Iniciando o reanudando AudioContext.');
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    source = audioCtx.createMediaElementSource(audio);
    source.connect(audioCtx.destination); 
    console.log('initAudio: AudioContext y fuente creados.');
  }

  if (loadingMessage) {
    loadingMessage.textContent = 'Espera unos segundos xfa';
    loadingMessage.style.display = 'block';
  }

  if (audioCtx.state === 'suspended') {
    try {
        await audioCtx.resume();
        console.log('AudioContext reanudado.');
    } catch (e) {
        console.error("Error al reanudar AudioContext:", e);
        if (loadingMessage) loadingMessage.style.display = 'none';
        return;
    }
  } 
  
  playAudioAndSetup();
}

function playAudioAndSetup() {
    audio.play().then(() => {
        console.log("playAudioAndSetup: Audio reproduciéndose. AudioContext state:", audioCtx.state);
        audioInitialized = true;
        
        // Aplica la clase para el brillo pulsante sobre el círculo de fondo
        centralPlayTarget.classList.add('is-playing'); 

        radioStatusMessage.style.display = 'none';
        radioStatusMessage.textContent = '';
        if (loadingMessage) loadingMessage.style.display = 'none';

        requestWakeLock();
        connectToMetadataStream();

    }).catch(e => {
        console.error("playAudioAndSetup: Error al reproducir audio:", e);
        radioStatusMessage.textContent = 'Error al iniciar la radio (requiere interacción).';
        radioStatusMessage.style.display = 'block';
        
        centralPlayTarget.classList.remove('is-playing'); 

        if (loadingMessage) loadingMessage.style.display = 'none';
    });
}

function stopAudio() {
  console.log('stopAudio: Deteniendo audio.');
  audio.pause();
  audio.currentTime = 0;
  radioStatusMessage.textContent = 'Radio Detenida';
  radioStatusMessage.style.display = 'block';
  audioInitialized = false;
  
  // Quita la clase para detener el brillo
  centralPlayTarget.classList.remove('is-playing'); 

  if (loadingMessage) loadingMessage.style.display = 'none';

  if (audioCtx && audioCtx.state === 'running') {
      audioCtx.suspend().then(() => console.log('AudioContext suspendido.'));
  }

  releaseWakeLock();
  
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
    console.log('Botón de información clickeado.');
    window.open('https://zeno.fm/radio/total-music-radio-q7yv/', '_blank');
}


document.addEventListener('DOMContentLoaded', (event) => {
    console.log('DOMContentLoaded: Interfaz final adaptada a fondo estático sin logo separado.');
    radioStatusMessage.style.display = 'none';
    if (loadingMessage) loadingMessage.style.display = 'none';
    
    // Listeners de botones secundarios
    refreshButton.addEventListener('click', refreshPage);
    infoButton.addEventListener('click', openInfoPage);
    
    // Listener CLAVE: El área transparente sobre el círculo central (nuevo botón Play/Stop)
    centralPlayTarget.addEventListener('click', function() {
        if (audioInitialized) {
            togglePlayPause();
        } else {
            initAudio();
        }
    });
});