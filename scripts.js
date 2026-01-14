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
        
        if (isMobile) requestWakeLock();
    } catch (err) {
        console.error("Error al iniciar audio:", err);
    }
}

function stopAudio() {
    audio.pause();
    audio.src = audio.src; // Limpia el buffer
    playButton.style.display = 'inline-block';
    stopButton.style.display = 'none';
    radioLogo.classList.remove('playing');
    if (wakeLock) wakeLock.release();
}

function setupVisualizer() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    source = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
}

// --- METADATA ZENO ---
function connectMetadata() {
    const eventSource = new EventSource('https://api.zeno.fm/mounts/metadata/subscribe/udgoxuccigfuv');
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.streamTitle) {
            songInfo.innerText = data.streamTitle;
        }
    };
}

// --- THREE.JS (Solo PC) ---
let scene, camera, renderer, stars;
function initStars() {
    if (isMobile) return; // Ahorro de batería inmediato

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 1;
    camera.rotation.x = Math.PI / 2;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('starfield-container').appendChild(renderer.domElement);

    const starGeo = new THREE.BufferGeometry();
    const starCoords = [];
    for (let i = 0; i < 6000; i++) {
        starCoords.push(Math.random() * 600 - 300, Math.random() * 600 - 300, Math.random() * 600 - 300);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.7 });
    stars = new THREE.Points(starGeo, starMaterial);
    scene.add(stars);

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    stars.rotation.y += 0.002;
    
    if (analyser && !isMobile) {
        analyser.getByteFrequencyData(dataArray);
        let avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
        stars.scale.set(1 + avg/200, 1 + avg/200, 1 + avg/200);
    }
    renderer.render(scene, camera);
}

// --- UTILIDADES ---
async function requestWakeLock() {
    try {
        wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) { console.log("WakeLock no soportado"); }
}

// Rotación de Logo (Marketing visual)
const positions = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];
setInterval(() => {
    const current = positions.findIndex(p => radioLogo.classList.contains(p));
    radioLogo.classList.remove(positions[current]);
    const next = (current + 1) % positions.length;
    radioLogo.classList.add(positions[next]);
}, 60000);

// Listeners
playButton.addEventListener('click', initAudio);
stopButton.addEventListener('click', stopAudio);
if(volumeControl) volumeControl.addEventListener('input', (e) => audio.volume = e.target.value);
document.getElementById('refreshButton').addEventListener('click', () => location.reload());
document.getElementById('fullscreenButton').addEventListener('click', () => document.documentElement.requestFullscreen());

window.onload = () => {
    connectMetadata();
    initStars();
};