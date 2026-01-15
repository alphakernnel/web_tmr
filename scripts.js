const audio = document.getElementById('audio');
const playButton = document.getElementById('playButton');
const stopButton = document.getElementById('stopButton');
const radioLogo = document.getElementById('radioLogo');
const songInfo = document.getElementById('songInfo');
const volumeControl = document.getElementById('volumeControl');

let audioCtx, analyser, dataArray, source;
let isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
let wakeLock = null;
let eventSource = null;

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
        
        if (isMobile && 'wakeLock' in navigator) {
            requestWakeLock();
        }
    } catch (err) {
        console.error("Error al iniciar audio:", err);
    }
}

function stopAudio() {
    audio.pause();
    audio.src = audio.src; 
    playButton.style.display = 'inline-block';
    stopButton.style.display = 'none';
    radioLogo.classList.remove('playing');
    if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
    }
}

// --- METADATA (ZENO API) - REFORZADA ---
function connectMetadata() {
    // Cerramos conexión previa si existe
    if (eventSource) {
        eventSource.close();
    }

    const streamId = 'udgoxuccigfuv';
    // Nota: Usamos la URL completa y aseguramos que no haya caché
    eventSource = new EventSource(`https://api.zeno.fm/mounts/metadata/subscribe/${streamId}?t=${Date.now()}`);

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data && data.streamTitle) {
                const title = data.streamTitle;
                songInfo.innerText = title;
                document.title = `TMR: ${title}`;
                console.log("Metadata recibida:", title);
            }
        } catch (e) {
            // Si no es JSON (ping de Zeno), lo ignoramos
        }
    };

    eventSource.onerror = (err) => {
        console.warn("Conexión de metadatos perdida. Reintentando...");
        eventSource.close();
        setTimeout(connectMetadata, 5000); // Reintento automático
    };
}

// --- THREE.JS (Solo PC) ---
let scene, camera, renderer, stars;
function initStars() {
    if (isMobile) return; 

    const container = document.getElementById('starfield-container');
    if(!container) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 1;
    camera.rotation.x = Math.PI / 2;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

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
    if(stars) stars.rotation.y += 0.001;
    
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
    } catch (err) { }
}

// Listeners
playButton.addEventListener('click', initAudio);
stopButton.addEventListener('click', stopAudio);
if(volumeControl) volumeControl.addEventListener('input', (e) => audio.volume = e.target.value);
document.getElementById('refreshButton').addEventListener('click', () => location.reload());

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

// Movimiento del logo para evitar "quemado" de pantalla
const positions = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];
setInterval(() => {
    const current = positions.findIndex(p => radioLogo.classList.contains(p));
    radioLogo.classList.remove(positions[current]);
    const next = (current + 1) % positions.length;
    radioLogo.classList.add(positions[next]);
}, 60000);

// INICIO DE LA APP
document.addEventListener('DOMContentLoaded', () => {
    connectMetadata(); // Primero conectamos los datos
    if(!isMobile) initStars(); // Luego el visualizador si es PC
});