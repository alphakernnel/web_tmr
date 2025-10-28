const radioStatusMessage = document.getElementById('radioStatusMessage');
const loadingMessage = document.getElementById('loadingMessage');
const playButton = document.getElementById('playButton');
const audio = document.getElementById('audio');
const radioLogo = document.getElementById('radioLogo');
const songInfo = document.getElementById('songInfo');
const refreshButton = document.getElementById('refreshButton');
const infoButton = document.getElementById('infoButton'); // Botón de información (link a Zeno)

let audioCtx = null;
let source, analyser, dataArray;
let renderer, scene, camera, stars, starGeo;
let audioInitialized = false;
let wakeLock = null;

let eventSource = null;
let lastSongTitle = '';

// --- Three.js Starfield Animation ---
function initThreeJS() {
  console.log('initThreeJS: Intentando inicializar Three.js');
  if (typeof THREE === 'undefined') {
    console.error('initThreeJS: ERROR - THREE.js no está cargado.');
    return;
  }

  const container = document.getElementById('starfield-container');
  if (!container) {
    console.error('initThreeJS: ERROR - Contenedor #starfield-container no encontrado.');
    return;
  }
  while (container.firstChild) {
      container.removeChild(container.firstChild);
  }

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.z = 1;
  camera.rotation.x = Math.PI / 2;

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    console.log('initThreeJS: Renderer y cámara inicializados.');
  } catch (e) {
    console.error('initThreeJS: ERROR al crear o añadir el renderer de Three.js:', e);
    return;
  }

  starGeo = new THREE.BufferGeometry();
  const vertices = [];
  const starCount = 3000; // Mantenido para rendimiento en móvil
  for (let i = 0; i < starCount; i++) {
    vertices.push(
      Math.random() * 600 - 300,
      Math.random() * 600 - 300,
      Math.random() * 600 - 300
    );
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  console.log(`initThreeJS: ${starCount} estrellas generadas.`);

  const starTextureLoader = new THREE.TextureLoader();
  starTextureLoader.load('https://raw.githubusercontent.com/alphakernnel/web_tmr/main/star.png',
    function(sprite) {
      const starMaterial = new THREE.PointsMaterial({
        color: 0xaaaaaa,
        size: 0.7,
        map: sprite,
        transparent: true,
        blending: THREE.AdditiveBlending
      });
      stars = new THREE.Points(starGeo, starMaterial);
      scene.add(stars);
      console.log('initThreeJS: Estrellas con textura añadidas a la escena.');
    },
    undefined,
    function(err) {
      console.error('initThreeJS: ERROR al cargar la textura de estrella. Usando material básico.', err);
      const starMaterial = new THREE.PointsMaterial({
        color: 0xaaaaaa,
        size: 0.7,
        transparent: true,
        blending: THREE.AdditiveBlending
      });
      stars = new THREE.Points(starGeo, starMaterial);
      scene.add(stars);
    }
  );

  window.addEventListener('resize', onWindowResize, false);
  console.log('initThreeJS: Listener de redimensionamiento añadido.');
}

function onWindowResize() {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

function animateStars() {
  requestAnimationFrame(animateStars);

  if (stars && starGeo && stars.geometry.attributes.position) {
    const positions = stars.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      // Movimiento vertical de las estrellas
      positions [i + 1] -= 0.5;
      if (positions [i + 1] < -300) {
        positions [i + 1] = 300;
      }
    }
    stars.geometry.attributes.position.needsUpdate = true;
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}
// --- Fin Three.js Starfield Animation ---

// --- Funciones para la Wake Lock API (Mantenidas por ser clave en móvil) ---
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

// --- Obtener metadatos de Zeno Radio con EventSource (MODIFICADO para 2 LÍNEAS) ---
function connectToMetadataStream() {
    if (eventSource) {
        eventSource.close();
    }
    
    // Asumiendo que el ID de Zeno sigue siendo 'udgoxuccigfuv'
    const metadataUrl = 'https://api.zeno.fm/mounts/metadata/subscribe/udgoxuccigfuv';
    eventSource = new EventSource(metadataUrl);

    eventSource.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            if (data && data.streamTitle) {
                const newSongTitle = data.streamTitle;
                
                if (lastSongTitle !== newSongTitle) {
                    
                    // LÓGICA CLAVE: Separar Artista y Título en dos líneas
                    let displayTitle = newSongTitle;
                    const separatorIndex = newSongTitle.indexOf(' - ');
                    
                    if (separatorIndex !== -1) {
                        // Si encuentra ' - ', usa <br> para el salto de línea.
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


function initAudio() {
  console.log('initAudio: Iniciando o reanudando AudioContext.');
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // Los nodos del analyser se mantienen por si se desea añadir una visualización de audio Three.js
    source = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    console.log('initAudio: AudioContext y nodos creados.');
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
        
        // Asumiendo que el ID del botón de Play/Stop es 'playButton'
        playButton.classList.add('playing');
        playButton.innerHTML = '<i class="fas fa-stop"></i>'; 
        
        radioLogo.classList.add('playing'); // Iniciar pulso del logo
        radioStatusMessage.style.display = 'none';
        radioStatusMessage.textContent = '';
        if (loadingMessage) loadingMessage.style.display = 'none';

        requestWakeLock(); // Solicitar Wake Lock
        connectToMetadataStream(); // Iniciar metadatos

    }).catch(e => {
        console.error("playAudioAndSetup: Error al reproducir audio:", e);
        radioStatusMessage.textContent = 'Error al iniciar la radio (requiere interacción).';
        radioStatusMessage.style.display = 'block';
        playButton.classList.remove('playing');
        playButton.innerHTML = '<i class="fas fa-play"></i>';
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
  radioLogo.classList.remove('playing');
  if (loadingMessage) loadingMessage.style.display = 'none';

  playButton.classList.remove('playing');
  playButton.innerHTML = '<i class="fas fa-play"></i>';

  if (audioCtx && audioCtx.state === 'running') {
      audioCtx.suspend().then(() => console.log('AudioContext suspendido.'));
  }

  releaseWakeLock(); // Liberar Wake Lock
  
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
    // Mantengo esta función para el botón de "info" o "link"
    window.open('https://zeno.fm/radio/total-music-radio-q7yv/', '_blank');
}


document.addEventListener('DOMContentLoaded', (event) => {
    console.log('DOMContentLoaded: DOM completamente cargado.');
    radioStatusMessage.style.display = 'none';
    if (loadingMessage) loadingMessage.style.display = 'none';
    
    // Los listeners de los botones de control
    playButton.addEventListener('click', togglePlayPause); 
    refreshButton.addEventListener('click', refreshPage);
    // Ya no se necesita fullscreenButton.addEventListener('click', toggleFullscreen);
    infoButton.addEventListener('click', openInfoPage);
    
    // Listener para el logo central como Play/Pause
    radioLogo.addEventListener('click', function() {
        if (audioInitialized) {
            togglePlayPause();
        } else {
            initAudio();
        }
    });

    // Ya no se necesita document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    initThreeJS();
    animateStars();
    
    // Eliminada: Lógica de posicionamiento y movimiento del logo
});