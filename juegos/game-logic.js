const character = document.getElementById('myCharacter');
let isJumping = false;       // True si el personaje está en el aire
let canDoubleJump = false;   // True si se puede realizar el segundo salto
let jumpTimeout;             // ID del temporizador para la caída del primer salto

let touchStartTime;          // Marca de tiempo cuando se inicia el toque/clic
let isTouching = false;      // True si el dedo/ratón está presionado
let rotationTimeout;         // ID del temporizador para la rotación por presión prolongada

// Constantes de altura y duración para los saltos
const initialJumpHeight = 100; // Desplazamiento desde el suelo (10px + 90px de desplazamiento)
const doubleJumpAddedHeight = initialJumpHeight / 2; // Altura adicional en el doble salto
const finalDoubleJumpHeight = 10 + initialJumpHeight + doubleJumpAddedHeight; // Altura total (base + salto inicial + mitad)

const jumpUpDuration = 150;  // Duración de la subida (ms)
const jumpDownDuration = 100; // Duración de la bajada del salto simple (ms)
const doubleJumpDownDuration = 150; // Duración de la bajada del doble salto (ms)
const longPressDuration = 2000; // Duración para activar la rotación (2 segundos)

/**
 * Maneja la lógica de salto (salto simple y doble salto).
 */
function jump() {
    if (!isJumping) {
        // Primer salto
        isJumping = true;
        canDoubleJump = true;
        
        character.classList.remove('falling', 'rotated'); // Limpia estados anteriores
        character.classList.add('jumping'); // Inicia la subida del primer salto

        // Temporizador para el inicio de la caída del primer salto
        jumpTimeout = setTimeout(() => {
            character.classList.remove('jumping');
            character.classList.add('falling'); // Inicia la bajada
            
            // Temporizador para finalizar la caída y resetear
            setTimeout(() => {
                character.classList.remove('falling');
                isJumping = false;
                canDoubleJump = false; // No se puede doble saltar desde el suelo
            }, jumpDownDuration); 
            
        }, jumpUpDuration); 

    } else if (canDoubleJump) {
        // Doble salto
        canDoubleJump = false; // Desactiva para evitar triple/cuádruple salto
        clearTimeout(jumpTimeout); // Detiene cualquier caída pendiente del primer salto

        character.classList.remove('jumping', 'falling', 'rotated'); // Limpia estados anteriores
        character.classList.add('double-jumping'); // Inicia la animación de doble salto
        character.style.bottom = `${finalDoubleJumpHeight}px`; // Fija la altura del doble salto

        // Temporizador para la caída desde el doble salto
        setTimeout(() => {
            character.classList.remove('double-jumping');
            character.classList.add('falling'); // Inicia la bajada desde el doble salto
            character.style.bottom = '10px'; // Asegura que baje hasta el suelo

            // Temporizador para finalizar la caída y resetear
            setTimeout(() => {
                character.classList.remove('falling');
                isJumping = false;
            }, doubleJumpDownDuration); 
            
        }, jumpUpDuration); // Duración de la "subida" extra del doble salto
    }
}

/**
 * Maneja el inicio de un toque (o click de ratón).
 * @param {Event} event - El objeto del evento.
 */
function handleStart(event) {
    event.preventDefault(); // Evita scroll, zoom o selección de texto

    isTouching = true;
    touchStartTime = Date.now();

    // Inicia el temporizador para la rotación por presión prolongada
    rotationTimeout = setTimeout(() => {
        // Solo si el dedo sigue presionado y ha pasado el tiempo
        if (isTouching && (Date.now() - touchStartTime) >= longPressDuration) {
            character.classList.add('rotated');
        }
    }, longPressDuration);

    // Inicia el primer salto solo si el personaje no está ya saltando
    if (!isJumping) {
        jump();
    }
}

/**
 * Maneja el final de un toque (o click de ratón).
 * @param {Event} event - El objeto del evento.
 */
function handleEnd(event) {
    isTouching = false;
    clearTimeout(rotationTimeout); // Cancela el temporizador de rotación si no se completó

    // Si el personaje está en el aire y puede doble saltar,
    // Y el toque fue corto (no una presión prolongada)
    if (isJumping && canDoubleJump && (Date.now() - touchStartTime) < longPressDuration) {
        jump(); // Llama a jump() para activar el doble salto
    }
    
    // Siempre remueve la rotación al soltar (sea por tiempo o por soltar antes)
    character.classList.remove('rotated');
}

// --- Asignación de Event Listeners ---
// Eventos táctiles para móviles
document.body.addEventListener('touchstart', handleStart, { passive: false }); // passive: false para permitir preventDefault
document.body.addEventListener('touchend', handleEnd);
document.body.addEventListener('touchcancel', handleEnd); // Para cuando un toque es interrumpido (ej. llamada entrante)

// Eventos de ratón para pruebas en escritorio
document.body.addEventListener('mousedown', handleStart);
document.body.addEventListener('mouseup', handleEnd);
// Maneja el caso en que el ratón se arrastra fuera del área mientras está presionado
document.body.addEventListener('mouseleave', (event) => {
    if (isTouching) handleEnd(event);
});