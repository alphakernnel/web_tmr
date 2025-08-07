const radioStatusMessage = document.getElementById('radioStatusMessage');
const loadingMessage = document.getElementById('loadingMessage');
const playButton = document.getElementById('playButton');
const stopButton = document.getElementById('stopButton');
const volumeControl = document.getElementById('volumeControl');
const refreshButton = document.getElementById('refreshButton');
const fullscreenButton = document.getElementById('fullscreenButton');
const infoButton = document.getElementById('infoButton');
const audio = document.getElementById('audio');
const radioLogo = document.getElementById('radioLogo');

let audioCtx = null;
let source, analyser, dataArray;
let renderer, scene, camera, stars, starGeo;
let audioInitialized = false;
let wakeLock = null; // Variable para almacenar el objeto WakeLock

// Array con las clases CSS de las 4 esquinas
const logoPositions = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];
let currentLogoPositionIndex = 0;

// --- Three.js Starfield Animation ---
function initThreeJS() {
  console.log('initThreeJS: Intentando inicializar Three.js');
  if (typeof THREE === 'undefined') {
    console.error('initThreeJS: ERROR - THREE.js no está cargado. Asegúrate de que el script src sea correcto y esté accesible.');
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
  const starCount = 6000;
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
      positions [i + 1] -= 0.5;
      if (positions [i + 1] < -300) {
        positions [i + 1] = 300;
      }
    }
    stars.geometry.attributes.position.needsUpdate = true;
  }

  if (audioInitialized && audio.paused === false && analyser && dataArray) {
      analyser.getByteFrequencyData(dataArray);
      let sum = dataArray.reduce((a, b) => a + b, 0);
      let avg = sum / dataArray.length;
      if (stars && stars.material) {
        stars.material.color.setScalar(0.7 + (avg / 255) * 0.8);
      }
  } else {
      if (stars && stars.material) {
        stars.material.color.setScalar(0.7);
      }
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}
// --- Fin Three.js Starfield Animation ---

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

// Escuchar el evento de visibilidad de la página para re-solicitar el wake lock
document.addEventListener('visibilitychange', () => {
    if (wakeLock !== null && document.visibilityState === 'visible' && !audio.paused) {
        console.log('Página visible y audio reproduciéndose. Re-solicitando wake lock.');
        requestWakeLock();
    }
});
// --- Fin Funciones para la Wake Lock API ---


function initAudio() {
  console.log('initAudio: Iniciando o reanudando AudioContext.');
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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
        playButton.style.display = 'none';
        stopButton.style.display = 'inline-block';

        radioLogo.classList.add('playing');

        radioStatusMessage.style.display = 'none';
        radioStatusMessage.textContent = '';
        if (loadingMessage) loadingMessage.style.display = 'none';

        // NUEVO: Solicita el wake lock cuando la reproducción comienza
        requestWakeLock();

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

  // NUEVO: Libera el wake lock cuando el audio se detiene
  releaseWakeLock();
}

function setVolume(value) {
  audio.volume = value;
  console.log('Volumen ajustado a:', value);
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

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error al intentar activar pantalla completa: ${err.message} (${err.name})`);
        });
    } else {
        document.exitFullscreen();
    }
}

function openInfoPage() {
    console.log('Botón de información clickeado. Deteniendo audio y abriendo página de ZenoRadio.');
    stopAudio();
    window.open('https://zeno.fm/radio/total-music-radio-q7yv/', '_blank');
}

function handleFullscreenChange() {
  if (document.fullscreenElement) {
    document.body.classList.add('is-fullscreen');
    console.log('Modo Pantalla Completa Activado: Clase "is-fullscreen" añadida al body.');
  } else {
    document.body.classList.remove('is-fullscreen');
    console.log('Modo Pantalla Completa Desactivado: Clase "is-fullscreen" eliminada del body.');
  }
}

// NUEVA FUNCIÓN: Mueve el logo de forma aleatoria
function moveLogo() {
    console.log('Iniciando movimiento del logo...');

    // 1. Iniciar fade-out (durante 1 minuto)
    radioLogo.style.transition = 'opacity 60s linear'; // Transición de opacidad de 1 minuto
    radioLogo.classList.add('fade-out');

    // 2. Después de 1 minuto (60 segundos), cambiar de posición y hacer fade-in
    setTimeout(() => {
        // Remover la clase de la posición anterior
        radioLogo.classList.remove(logoPositions[currentLogoPositionIndex]);

        // Elegir una nueva posición aleatoria (diferente a la actual)
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * logoPositions.length);
        } while (newIndex === currentLogoPositionIndex);
        currentLogoPositionIndex = newIndex;

        // Agregar la nueva clase de posición
        radioLogo.classList.add(logoPositions[currentLogoPositionIndex]);

        // Iniciar fade-in (ya que la transición de opacidad es de 1 segundo por defecto)
        radioLogo.style.transition = 'opacity 1s ease-in-out'; // Restablecer la transición de opacidad normal
        radioLogo.classList.remove('fade-out');
        console.log('Logo movido a la posición:', logoPositions[currentLogoPositionIndex]);

    }, 60000); // 60 segundos
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
    volumeControl.addEventListener('input', (e) => setVolume(e.target.value));
    refreshButton.addEventListener('click', refreshPage);
    fullscreenButton.addEventListener('click', toggleFullscreen);
    infoButton.addEventListener('click', openInfoPage);

    radioLogo.addEventListener('click', function() {
        if (audioInitialized) {
            togglePlayPause();
        } else {
            initAudio();
        }
    });

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    initThreeJS();
    animateStars();
    console.log('DOMContentLoaded: Three.js y animación de estrellas inicializados.');
    
    // Configurar la posición inicial del logo y el temporizador de movimiento
    radioLogo.classList.add(logoPositions[currentLogoPositionIndex]); // Posición inicial (top-right)
    setInterval(moveLogo, 180000); // Mueve el logo cada 3 minutos (180,000 ms)
});