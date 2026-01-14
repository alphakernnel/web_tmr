const audio = document.getElementById('audio');
const playButton = document.getElementById('playButton');
const stopButton = document.getElementById('stopButton');
const radioLogo = document.getElementById('radioLogo');
const songInfo = document.getElementById('songInfo');
const volumeControl = document.getElementById('volumeControl');

let audioCtx, analyser, dataArray, source;
let isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
let wakeLock = null;

// --- GESTIÓN DE AUDIO ---
async function initAudio() {
    try {
        await audio.play();
        playButton.style.display = 'none';
        stopButton.style.display = 'inline-block';
        radioLogo.classList.add('playing');
        
        if (!audioCtx && !isMobile) {
            setupVisualizer();
        }
        
        // Activar WakeLock solo en móviles para que no se apague la pantalla
        if (isMobile && 'wakeLock' in navigator) {
            requestWakeLock();
        }
    } catch (err) {
        console.error("Error al iniciar audio:", err);
    }
}

function stopAudio() {
    audio.pause();
    audio.src = audio.src; // Reset del stream
    playButton.style.display = 'inline-block';
    stopButton.style.display = 'none';
    radioLogo.classList.remove('playing');
    if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
    }
}

// --- METADATA (ZENO API) ---
function connectMetadata() {
    // Usamos el ID de tu mount point: udgoxuccigfuv
    const streamId = 'udgoxuccigfuv';
    const eventSource = new EventSource(`https://api.zeno.fm/mounts/metadata/subscribe/${streamId}`);

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.streamTitle) {
                songInfo.innerText = data.streamTitle;
                // Actualizar el título de la pestaña también
                document.title = `TMR: ${data.streamTitle}`;
            }
        } catch (e) {
            console.error("Error parseando metadata", e);
        }
    };

    eventSource.onerror = () => {
        console.warn("Error en EventSource, reintentando...");
        eventSource.close();
        setTimeout(connectMetadata, 5000);
    };
}

// --- THREE.JS (Solo PC) ---
let scene, camera, renderer, stars;
function initStars() {
    if (isMobile) return; 

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 1;
    camera.rotation.x = Math.PI / 2;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('starfield-container').appendChild(renderer.domElement);

    const starGeo = new THREE.BufferGeometry();
    const starCoords = [];
    for (let i = 0; i < 6000; i++) {
        starCoords.push(Math.random() * 600 - 300, Math.random() * 600 - 300, Math.random() * 600 - 300);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 });
    stars = new THREE.Points(starGeo, starMaterial);
    scene.add(stars);

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    stars.rotation.y += 0.001;
    
    if (analyser && !isMobile) {
        analyser.getByteFrequencyData(dataArray);
        let avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
        stars.scale.set(1 + avg/150, 1 + avg/150, 1 + avg/150);
    }
    renderer.render(scene, camera);
}

// --- UTILIDADES ---
async function requestWakeLock() {
    try {
        wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) { /* No soportado */ }
}

// Listeners
playButton.addEventListener('click', initAudio);
stopButton.addEventListener('click', stopAudio);
if(volumeControl) volumeControl.addEventListener('input', (e) => audio.volume = e.target.value);
document.getElementById('refreshButton').addEventListener('click', () => location.reload());

// Solo asignar fullscreen si el botón existe (no es móvil)
const fsBtn = document.getElementById('fullscreenButton');
if(fsBtn) {
    fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    });
}

window.onload = () => {
    connectMetadata();
    if(!isMobile) initStars();
};