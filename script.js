// Código para el chat en vivo
const chatButton = document.getElementById('chat-button');
const chatPopup = document.getElementById('chat-popup');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatNickname = document.getElementById('chat-nickname');

let nickname = '';
let chatVisible = false;

chatButton.addEventListener('click', toggleChat);
chatSend.addEventListener('click', sendMessage);

function toggleChat() {
  chatVisible = !chatVisible;
  chatPopup.style.display = chatVisible ? 'block' : 'none';
}

function sendMessage() {
  const message = chatInput.value.trim();
  const nicknameValue = chatNickname.value.trim();

  if (message !== '' && nicknameValue !== '') {
    nickname = nicknameValue;
    const messageHTML = `<p><strong>${escapeHtml(nickname)}:</strong> ${escapeHtml(message)}</p>`;
    chatMessages.innerHTML += messageHTML;
    chatInput.value = '';
  } else {
    alert('Por favor, ingresa tu seudónimo y un mensaje');
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Código para la radio
const trackInfo = document.getElementById('trackInfo');
const playButton = document.getElementById('playButton');
const stopButton = document.getElementById('stopButton');
const volumeControl = document.getElementById('volumeControl');
const refreshButton = document.getElementById('refreshButton');
const fullscreenButton = document.getElementById('fullscreenButton');
const audio = document.getElementById('audio');
const radioLogo = document.getElementById('radioLogo');

// ... (resto del código para la radio)