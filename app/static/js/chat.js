import { setSendButtonToStop, resetSendButton, createCodeHeader, scrollToBottom } from './ui.js';
import { saveToLocalStorage } from './storage.js';
import { isGenerating, controller, setController } from './state.js';

let messages = [{
    "role": "system",
    "content": `You are an AI expert, answer in Chinese and markdown format. Follow these formatting rules:
1. Use proper indentation for code blocks
2. Break long paragraphs into shorter ones for better readability
3. Add line breaks after every main point
4. When showing code, always specify the language after triple backticks
5. Keep lines under 80 characters when possible
6. Use proper markdown formatting for lists and headings
7. For mathematical formulas:
- Use single $ for inline math expressions (e.g., $E=mc^2$)
- Use double $$ for block math expressions (e.g., $$\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$$)
- Always use proper LaTeX syntax for math expressions`
}];

let isNewChat = true;
let currentChatIndex = null;

async function sendMessage() {
    const userInput = document.getElementById('userInput');
    const text = userInput.value.trim();
    if (!text) return;

    // 清除欢迎消息
    if (isNewChat) {
        document.getElementById('chatBox').innerHTML = '';
    }

    appendMessage('user', text);
    userInput.value = '';
    messages.push({ "role": "user", "content": text });

    // 重置输入框高度
    userInput.style.height = 'auto';
    userInput.style.height = `${userInput.scrollHeight}px`;

    try {
        // 创建新的 AbortController
        const newController = new AbortController();
        setController(newController);
        setSendButtonToStop();

        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: text
            }),
            signal: newController.signal  // 使用新创建的 controller
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let fullResponse = '';
        const messageDiv = createMessageDiv();
        const contentDiv = messageDiv.querySelector('.message-content');

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const content = line.slice(6);
                    if (content !== '[DONE]') {
                        fullResponse += content;
                        updateMessageContent(contentDiv, fullResponse);
                    }
                }
            }
        }

        if (isNewChat) {
            saveToLocalStorage(text, fullResponse, [...messages]);
            isNewChat = false;
        } else if (currentChatIndex !== null) {
            // 更新现有对话
            const chats = JSON.parse(localStorage.getItem('chats') || '[]');
            if (chats[currentChatIndex]) {
                chats[currentChatIndex].messages = [...messages];
                localStorage.setItem('chats', JSON.stringify(chats));
            }
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Response generation was stopped');
        } else {
            console.error('Error:', error);
            appendMessage('system', '发生错误，请重试');
        }
    } finally {
        resetSendButton();
        setController(null);  // 重置 controller
    }
}

function createMessageDiv() {
    const chatBox = document.getElementById('chatBox');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';

    // 创建标题栏
    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';
    const titleSpan = document.createElement('span');
    titleSpan.textContent = 'AI';
    headerDiv.appendChild(titleSpan);

    // 添加复制按钮
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.textContent = '复制';
    copyButton.onclick = async () => {
        try {
            const content = messageDiv.querySelector('.message-content').textContent;
            await navigator.clipboard.writeText(content);
            copyButton.textContent = '已复制!';
            setTimeout(() => {
                copyButton.textContent = '复制';
            }, 2000);
        } catch (err) {
            console.error('复制失败:', err);
        }
    };
    headerDiv.appendChild(copyButton);

    // 创建内容区域
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content markdown-body';

    messageDiv.appendChild(headerDiv);
    messageDiv.appendChild(contentDiv);
    chatBox.appendChild(messageDiv);

    return messageDiv;
}

function updateMessageContent(contentDiv, markdown) {
    // 处理数学公式和 Markdown
    const mathExpressions = [];
    let processedContent = markdown.replace(/\$\$(.*?)\$\$|\$(.*?)\$/gs, (match, block, inline) => {
        const id = mathExpressions.length;
        mathExpressions.push({
            type: match.startsWith('$$') ? 'block' : 'inline',
            content: block || inline
        });
        return `%%MATH_${id}%%`;
    });

    processedContent = marked.parse(processedContent);

    processedContent = processedContent.replace(/%%MATH_(\d+)%%/g, (match, id) => {
        const expr = mathExpressions[parseInt(id)];
        return expr.type === 'block'
            ? `\\[${expr.content}\\]`
            : `\\(${expr.content}\\)`;
    });

    contentDiv.innerHTML = processedContent;

    // 渲染数学公式
    renderMathInElement(contentDiv, {
        delimiters: [
            { left: "\\[", right: "\\]", display: true },
            { left: "\\(", right: "\\)", display: false }
        ],
        throwOnError: false,
        output: 'html',
        strict: false
    });

    // 确保所有代码块都被高亮
    contentDiv.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightBlock(block);
        // 获取语言类
        const languageClass = block.className.match(/language-(\w+)/) || [null, 'plaintext'];
        const language = languageClass[1];
        // 添加标题栏和复制按钮
        createCodeHeader(block, language);
    });

    // 确保滚动到底部
    scrollToBottom();
}

function appendMessage(role, content) {
    const chatBox = document.getElementById('chatBox');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    // 创建标题栏
    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';
    const titleSpan = document.createElement('span');
    titleSpan.textContent = role === 'user' ? '用户' : 'AI';
    headerDiv.appendChild(titleSpan);

    // 添加复制按钮
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.textContent = '复制';
    copyButton.onclick = async () => {
        try {
            await navigator.clipboard.writeText(content);
            copyButton.textContent = '已复制!';
            setTimeout(() => {
                copyButton.textContent = '复制';
            }, 2000);
        } catch (err) {
            console.error('复制失败:', err);
        }
    };
    headerDiv.appendChild(copyButton);

    // 创建内容区域
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (role === 'user') {
        contentDiv.innerHTML = content.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
    } else {
        contentDiv.className += ' markdown-body';
        updateMessageContent(contentDiv, content);
    }

    messageDiv.appendChild(headerDiv);
    messageDiv.appendChild(contentDiv);
    chatBox.appendChild(messageDiv);
    scrollToBottom();
}

export { sendMessage, appendMessage, messages, isNewChat, currentChatIndex, isGenerating, controller }; 