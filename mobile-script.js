const radioStatusMessage = document.getElementById('radioStatusMessage');
const loadingMessage = document.getElementById('loadingMessage'); // Nuevo: Referencia al mensaje de carga
const playButton = document.getElementById('playButton');
const stopButton = document.getElementById('stopButton');
const refreshButton = document.getElementById('refreshButton');
const infoButton = document.getElementById('infoButton');
const audio = document.getElementById('audio');
const radioLogo = document.getElementById('radioLogo');

// Elementos para el visualizador
const audioVisualizer = document.getElementById('audioVisualizer');
const visualizerCtx = audioVisualizer ? audioVisualizer.getContext('2d') : null;

let audioCtx = null;
let source, analyser, dataArray;
let renderer, scene, camera, stars, starGeo;
let audioInitialized = false;

// --- Three.js Starfield Animation ---
function initThreeJS() {
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
}

function onWindowResize() {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  // Ajustar el tamaño del canvas del visualizador también
  if (audioVisualizer) {
    audioVisualizer.width = audioVisualizer.offsetWidth;
    audioVisualizer.height = audioVisualizer.offsetHeight;
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
      // Dibujar el visualizador de audio
      drawVisualizer();
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

// --- Funcionalidad del Visualizador de Audio ---
function drawVisualizer() {
    if (!visualizerCtx || !analyser || !dataArray) return;

    // Redimensionar el canvas si sus estilos CSS han cambiado el tamaño
    if (audioVisualizer.width !== audioVisualizer.offsetWidth || audioVisualizer.height !== audioVisualizer.offsetHeight) {
        audioVisualizer.width = audioVisualizer.offsetWidth;
        audioVisualizer.height = audioVisualizer.offsetHeight;
    }

    analyser.getByteFrequencyData(dataArray);

    visualizerCtx.clearRect(0, 0, audioVisualizer.width, audioVisualizer.height); // Limpiar el canvas

    const barWidth = (audioVisualizer.width / analyser.frequencyBinCount) * 2.5; // Ajuste para el ancho de las barras
    let x = 0;

    for (let i = 0; i < analyser.frequencyBinCount; i++) {
        let barHeight = dataArray[i] / 2; // Ajustar la altura para que no sea demasiado grande

        // Colores de las barras (degradado de rojo a naranja)
        const gradient = visualizerCtx.createLinearGradient(0, audioVisualizer.height, 0, 0);
        gradient.addColorStop(0, '#f44336'); // Rojo oscuro
        gradient.addColorStop(0.5, '#ff9800'); // Naranja
        gradient.addColorStop(1, '#ffeb3b'); // Amarillo brillante
        visualizerCtx.fillStyle = gradient;

        visualizerCtx.fillRect(x, audioVisualizer.height - barHeight, barWidth, barHeight);

        x += barWidth + 1; // Espacio entre las barras
    }
}
// --- Fin Visualizador de Audio ---


function initAudio() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    source = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
  }

  // Mostrar mensaje de carga ANTES de intentar reproducir
  if (loadingMessage) {
    loadingMessage.textContent = 'Espera unos segundos xfa';
    loadingMessage.style.display = 'block';
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => {
      playAudioAndSetup();
    }).catch(e => {
      console.error("Error al reanudar AudioContext:", e);
      if (loadingMessage) loadingMessage.style.display = 'none'; // Ocultar mensaje de carga en caso de error
    });
  } else {
    playAudioAndSetup();
  }
}

function playAudioAndSetup() {
    audio.play().then(() => {
        audioInitialized = true;
        playButton.style.display = 'none';
        stopButton.style.display = 'inline-block';
        radioLogo.classList.add('playing');
        radioStatusMessage.style.display = 'none';
        radioStatusMessage.textContent = '';

        if (loadingMessage) loadingMessage.style.display = 'none'; // Ocultar mensaje de carga al iniciar

        // Mostrar el visualizador
        if (audioVisualizer) {
            audioVisualizer.style.display = 'block';
            audioVisualizer.width = audioVisualizer.offsetWidth;
            audioVisualizer.height = audioVisualizer.offsetHeight;
        }

        // --- Implementación de Media Session API ---
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: 'Total Music Radio',
                artist: 'Streaming de Música Rock y Metal',
                album: 'Radio Online',
                artwork: [
                    { src: radioLogo.src, sizes: '96x96', type: 'image/png' },
                    { src: radioLogo.src, sizes: '128x128', type: 'image/png' },
                    { src: radioLogo.src, sizes: '192x192', type: 'image/png' },
                    { src: radioLogo.src, sizes: '256x256', type: 'image/png' },
                    { src: radioLogo.src, sizes: '384x384', type: 'image/png' },
                    { src: radioLogo.src, sizes: '512x512', type: 'image/png' },
                ]
            });

            navigator.mediaSession.setActionHandler('play', () => { audio.play(); });
            navigator.mediaSession.setActionHandler('pause', () => { audio.pause(); });
        }
        // --- Fin Media Session API ---

    }).catch(e => {
        console.error("Error al reproducir audio:", e);
        radioStatusMessage.textContent = 'Error al iniciar la radio (requiere interacción).';
        radioStatusMessage.style.display = 'block';
        playButton.style.display = 'inline-block';
        stopButton.style.display = 'none';
        if (loadingMessage) loadingMessage.style.display = 'none'; // Ocultar mensaje de carga en caso de error
    });
}

function stopAudio() {
  audio.pause();
  audio.currentTime = 0;
  radioStatusMessage.textContent = 'Radio Detenida';
  radioStatusMessage.style.display = 'block';
  playButton.style.display = 'inline-block';
  stopButton.style.display = 'none';
  audioInitialized = false;
  radioLogo.classList.remove('playing');

  // Ocultar el visualizador
  if (audioVisualizer) {
      audioVisualizer.style.display = 'none';
  }
  if (loadingMessage) loadingMessage.style.display = 'none'; // Asegurarse de que el mensaje de carga no esté visible

  // Desactivar controles de Media Session
  if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null; // Borra los metadatos
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
  }

  if (audioCtx && audioCtx.state === 'running') {
      audioCtx.suspend();
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
    location.reload();
}

function openInfoPage() {
    console.log('Botón de información clickeado. Deteniendo audio y abriendo página de ZenoRadio.');
    stopAudio(); // Detener la música
    window.open('https://zeno.fm/radio/total-music-radio-q7yv/', '_blank'); // Abrir en nueva pestaña
}

// Inicializar listeners
document.addEventListener('DOMContentLoaded', (event) => {
    radioStatusMessage.style.display = 'none';
    if (loadingMessage) loadingMessage.style.display = 'none'; // Asegurarse de que esté oculto al cargar

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

    // Asegurarse de que el visualizador tenga el tamaño correcto desde el inicio
    if (audioVisualizer) {
        audioVisualizer.width = audioVisualizer.offsetWidth;
        audioVisualizer.height = audioVisualizer.offsetHeight;
    }

    initThreeJS();
    animateStars();
});