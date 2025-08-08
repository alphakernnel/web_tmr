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
let source, analyser, dataArray;
let renderer, scene, camera, stars, starGeo;
let audioInitialized = false;

let eventSource = null; // Variable para EventSource
let lastSongTitle = ''; // Variable para evitar actualizaciones repetidas

// --- Three.js Starfield Animation ---
function initThreeJS() {
  console.log('initThreeJS: Intentando inicializar Three.js');
  if (typeof THREE === 'undefined') {
    console.error('initThreeJS: ERROR - THREE.js no está cargado. Asegúrate de que el script src sea correcto.');
    return;
  }

  const container = document.getElementById('starfield-container');
  if (!container) {
    console.error('initThreeJS: ERROR - Contenedor #starfield-container no encontrado.');
    return;
  }
  // Limpiamos el contenedor para evitar duplicados
  while (container.firstChild) {
      container.removeChild(container.firstChild);
  }

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
  // CORREGIDO: La cámara se configura para que mire hacia adelante y esté en una posición inicial adecuada
  camera.position.z = 10;
  camera.position.y = 5;

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
    // CORREGIDO: La lógica de la animación se ajusta para el movimiento correcto de las estrellas
    stars.rotation.x += 0.0005;
    stars.rotation.y += 0.001;
    stars.rotation.z += 0.002;
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
        
        // Conectar a la API de metadatos
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
  
  // Ocultar la información de la canción y cerrar la conexión de EventSource
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

    // CORREGIDO: El inicializador se asegura de que la animación se muestre desde el principio
    initThreeJS();
    animateStars();
});