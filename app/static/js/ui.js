import { sendMessage } from './chat.js';
import { setGenerating } from './state.js';

function setSendButtonToStop() {
    const sendButton = document.getElementById('sendButton');
    sendButton.classList.add('sending');
    sendButton.querySelector('.button-icon').innerHTML = '<div class="stop-icon"></div>';
    setGenerating(true);
}

function resetSendButton() {
    const sendButton = document.getElementById('sendButton');
    sendButton.classList.remove('sending');
    sendButton.querySelector('.button-icon').innerHTML = '▶';
    setGenerating(false);
}

function adjustInputHeight() {
    // ... 原有的adjustInputHeight函数代码 ...
}

function scrollToBottom() {
    // ... 原有的scrollToBottom函数代码 ...
}

function createCodeHeader(codeBlock, language) {
    // ... 原有的createCodeHeader函数代码 ...
}

export { 
    setSendButtonToStop, 
    resetSendButton, 
    adjustInputHeight, 
    scrollToBottom, 
    createCodeHeader 
}; 