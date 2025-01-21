const API_KEY = 'sk-xxxxxx';  // 直接指定API密钥
const BASE_URL = 'https://api.deepseek.com';

marked.setOptions({
    highlight: function (code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(code, {
                    language: lang,
                    ignoreIllegals: true
                }).value;
            } catch (e) {
                console.error(e);
            }
        }
        return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true
});

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

let isNewChat = true;  // 添加标记来判断是否是新对话

let currentChatIndex = null;  // 添加当前对话索引标记

// 添加发送按钮相关的变量和函数
let controller;  // 确保 controller 是全局变量
let isGenerating = false;  // 确保 isGenerating 是全局变量
const sendButton = document.getElementById('sendButton');

function setSendButtonToStop() {
    const sendButton = document.getElementById('sendButton');
    sendButton.classList.add('sending');
    sendButton.querySelector('.button-icon').innerHTML = '<div class="stop-icon"></div>';  // 使用方块图标
    isGenerating = true;  // 设置为正在生成
}

function resetSendButton() {
    const sendButton = document.getElementById('sendButton');
    sendButton.classList.remove('sending');
    sendButton.querySelector('.button-icon').innerHTML = '▶';  // 恢复为三角形图标
    isGenerating = false;  // 设置为不在生成
}

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
    userInput.style.height = 'auto';  // 先设置为 auto，以便计算高度
    userInput.style.height = `${userInput.scrollHeight}px`;  // 设置为当前内容的高度

    try {
        controller = new AbortController();  // 创建新的 AbortController
        setSendButtonToStop();  // 设置按钮为停止状态

        const response = await fetch(`${BASE_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: messages,
                temperature: 0.7,
                max_tokens: 8000,
                stream: true,
            }),
            signal: controller.signal  // 将信号传递给 fetch
        });

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
                await navigator.clipboard.writeText(fullResponse);
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

        // 组装消息结构
        messageDiv.appendChild(headerDiv);
        messageDiv.appendChild(contentDiv);
        chatBox.appendChild(messageDiv);

        let fullResponse = '';
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        messages.push({ "role": "assistant", "content": "" });

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.choices[0].delta.content) {
                            const content = data.choices[0].delta.content;
                            fullResponse += content;

                            // 处理数学公式和 Markdown
                            const mathExpressions = [];
                            let processedContent = fullResponse.replace(/\$\$(.*?)\$\$|\$(.*?)\$/gs, (match, block, inline) => {
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
                    } catch (e) {
                        console.error('Error parsing chunk:', e);
                    }
                }
            }

            // 更新最后一条消息的内容
            messages[messages.length - 1].content = fullResponse;
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
        controller = null;
    }
}

function appendMessage(role, content) {
    const chatBox = document.getElementById('chatBox');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    // 创建标题栏
    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';

    // 添加角色标题
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
        // 用户消息保持原始格式
        contentDiv.innerHTML = content.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
    } else {
        // AI消息使用markdown渲染
        contentDiv.className += ' markdown-body';

        // 先将数学公式部分提取出来，用占位符替代
        const mathExpressions = [];
        let processedContent = content.replace(/\$\$(.*?)\$\$|\$(.*?)\$/gs, (match, block, inline) => {
            const id = mathExpressions.length;
            mathExpressions.push({
                type: match.startsWith('$$') ? 'block' : 'inline',
                content: block || inline
            });
            return `%%MATH_${id}%%`;
        });

        // 渲染 Markdown
        processedContent = marked.parse(processedContent);

        // 还原数学公式
        processedContent = processedContent.replace(/%%MATH_(\d+)%%/g, (match, id) => {
            const expr = mathExpressions[parseInt(id)];
            return expr.type === 'block'
                ? `\\[${expr.content}\\]`
                : `\\(${expr.content}\\)`;
        });

        contentDiv.innerHTML = `<div class="markdown-body">${processedContent}</div>`;

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

        // 处理代码高亮等
        contentDiv.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
            // 获取语言类
            const languageClass = block.className.match(/language-(\w+)/) || [null, 'plaintext'];
            const language = languageClass[1];
            // 添加标题栏和复制按钮
            createCodeHeader(block, language);
        });
    }

    messageDiv.appendChild(headerDiv);
    messageDiv.appendChild(contentDiv);
    chatBox.appendChild(messageDiv);
    scrollToBottom();
}

function saveToLocalStorage(question, answer, allMessages) {
    const timestamp = new Date().toISOString();
    const chat = {
        timestamp,
        question,
        answer,
        messages: allMessages,
        title: generateChatTitle(question, answer)
    };

    let chats = JSON.parse(localStorage.getItem('chats') || '[]');
    chats.push(chat);
    currentChatIndex = chats.length - 1;  // 设置当前对话索引
    localStorage.setItem('chats', JSON.stringify(chats));
    updateChatHistory();
}

function generateChatTitle(question, answer) {
    // 使用问题的前20个字符作为标题
    return question.slice(0, 20) + (question.length > 20 ? '...' : '');
}

function updateChatHistory() {
    const historyDiv = document.getElementById('chatHistory');
    const chats = JSON.parse(localStorage.getItem('chats') || '[]');

    historyDiv.innerHTML = '';
    chats.reverse().forEach((chat, index) => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        if (currentChatIndex === (chats.length - 1 - index)) {
            chatItem.classList.add('active');
        }

        // 添加标题容器
        const titleDiv = document.createElement('div');
        titleDiv.className = 'chat-title';
        titleDiv.textContent = chat.title;
        titleDiv.onclick = () => loadChat(chats.length - 1 - index);

        // 添加删除按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '✕';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();  // 阻止事件冒泡
            deleteChat(chats.length - 1 - index);
        };

        chatItem.appendChild(titleDiv);
        chatItem.appendChild(deleteBtn);
        historyDiv.appendChild(chatItem);
    });
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');

    sidebar.classList.toggle('hidden');
    mainContent.classList.toggle('sidebar-hidden');
}

let isSearchActive = false;
let currentSearchTerm = '';

function showSearch() {
    const searchContainer = document.getElementById('searchContainer');
    searchContainer.classList.add('active');
    document.getElementById('searchInput').focus();
}

function closeSearch() {
    const searchContainer = document.getElementById('searchContainer');
    searchContainer.classList.remove('active');
    document.getElementById('searchInput').value = '';
    isSearchActive = false;
    currentSearchTerm = '';
    updateChatHistory();  // 恢复显示所有历史记录
}

function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    if (!searchTerm) return;

    isSearchActive = true;
    currentSearchTerm = searchTerm;
    const chats = JSON.parse(localStorage.getItem('chats') || '[]');

    // 在标题和内容中搜索
    const results = chats.filter(chat =>
        chat.question.toLowerCase().includes(searchTerm) ||
        chat.answer.toLowerCase().includes(searchTerm)
    );

    const historyDiv = document.getElementById('chatHistory');
    historyDiv.innerHTML = '';

    // 显示搜索结果
    results.reverse().forEach((chat, index) => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';

        // 高亮显示匹配的文本
        let title = generateChatTitle(chat.question, chat.answer);
        if (title.toLowerCase().includes(searchTerm)) {
            title = title.replace(new RegExp(searchTerm, 'gi'),
                match => `<span class="highlight">${match}</span>`);
        }

        chatItem.innerHTML = title;

        // 使用原始索引加载正确的对话
        const originalIndex = chats.findIndex(c =>
            c.timestamp === chat.timestamp &&
            c.question === chat.question
        );

        chatItem.onclick = () => {
            loadChat(originalIndex);
            // 在加载的对话内容中也高亮显示搜索词
            highlightSearchInChat(searchTerm);
        };

        historyDiv.appendChild(chatItem);
    });
}

// 在对话内容中高亮显示搜索词
function highlightSearchInChat(searchTerm) {
    const chatBox = document.getElementById('chatBox');
    const messages = chatBox.getElementsByClassName('message');

    Array.from(messages).forEach(message => {
        const content = message.innerHTML;
        message.innerHTML = content.replace(new RegExp(searchTerm, 'gi'),
            match => `<span class="highlight">${match}</span>`);
    });
}

function startNewChat() {
    messages = [{
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

    document.getElementById('chatBox').innerHTML = '';

    // 添加欢迎消息
    const welcomeMessage = `## 👋 欢迎使用 AI 助手！

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0;">
<div style="background: #f8f9fa; padding: 10px; border-radius: 6px; border: 1px solid #e9ecef;">
<h4 style="margin: 0 0 4px 0;">🔍 解答问题</h4>
<div style="font-size: 0.9em; line-height: 1.3;">
技术咨询 • 概念解释 • 方案建议
</div>
</div>
<div style="background: #f8f9fa; padding: 10px; border-radius: 6px; border: 1px solid #e9ecef;">
<h4 style="margin: 0 0 4px 0;">💻 编程辅助</h4>
<div style="font-size: 0.9em; line-height: 1.3;">
代码审查 • 算法设计 • 调试帮助
</div>
</div>
<div style="background: #f8f9fa; padding: 10px; border-radius: 6px; border: 1px solid #e9ecef;">
<h4 style="margin: 0 0 4px 0;">📝 文档协作</h4>
<div style="font-size: 0.9em; line-height: 1.3;">
文档编写 • API生成 • 注释优化
</div>
</div>
<div style="background: #f8f9fa; padding: 10px; border-radius: 6px; border: 1px solid #e9ecef;">
<h4 style="margin: 0 0 4px 0;">🎯 项目支持</h4>
<div style="font-size: 0.9em; line-height: 1.3;">
架构设计 • 性能优化 • 安全建议
</div>
</div>
</div>`;

    appendMessage('assistant', welcomeMessage);
    isNewChat = true;
    currentChatIndex = null;
    updateChatHistory();
}

function loadChat(index) {
    const chats = JSON.parse(localStorage.getItem('chats') || '[]');
    const chat = chats[index];
    if (chat && chat.messages) {
        currentChatIndex = index;  // 设置当前对话索引
        document.getElementById('chatBox').innerHTML = '';

        // 加载所有消息
        messages = [...chat.messages];

        // 显示所有消息
        chat.messages.forEach(msg => {
            if (msg.role !== 'system') {
                appendMessage(msg.role, msg.content);
            }
        });

        isNewChat = false;
    }
}

window.onload = function () {
    updateChatHistory();
};

const input = document.getElementById('userInput');

// 添加自动调整高度的函数
function adjustInputHeight() {
    const input = document.getElementById('userInput');
    const lineHeight = parseInt(window.getComputedStyle(input).lineHeight);
    // 计算当前文本的行数
    const lines = input.value.split('\n');
    // 设置最大行数为10
    const maxRows = 10;
    const rows = Math.min(lines.length, maxRows);
    // 设置高度
    input.style.height = (rows * lineHeight) + 'px';
}

// 添加输入事件监听，以便在任何输入时调整高度
document.getElementById('userInput').addEventListener('input', function () {
    adjustInputHeight(this);
});

// 监听键盘事件
document.getElementById('userInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        if (e.shiftKey) {
            // Shift + Enter: 换行并调整高度
            setTimeout(() => adjustInputHeight(this), 0);
        }
    }
});

// 修改事件监听和处理逻辑
document.addEventListener('DOMContentLoaded', function () {
    const input = document.getElementById('userInput');

    // 只保留发送消息的功能
    input.addEventListener('keydown', async function (e) {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                // Shift + Enter: 换行
                return;
            } else {
                // Enter: 发送
                e.preventDefault();
                const text = input.value.trim();
                if (text) {
                    await sendMessage();
                }
            }
        }
    });
});

// 添加删除对话的函数
function deleteChat(index) {
    if (confirm('确定要删除这个对话吗？')) {
        let chats = JSON.parse(localStorage.getItem('chats') || '[]');
        chats.splice(index, 1);
        localStorage.setItem('chats', JSON.stringify(chats));

        // 如果删除的是当前对话，清空聊天框并重置状态
        if (currentChatIndex === index) {
            startNewChat();
        } else if (currentChatIndex > index) {
            // 如果删除的是当前对话之前的对话，需要调整currentChatIndex
            currentChatIndex--;
        }

        updateChatHistory();
    }
}

// 添加滚动到底部的函数
function scrollToBottom() {
    const chatBox = document.getElementById('chatBox');
    const chatContainer = document.querySelector('.chat-container');

    // 使用 requestAnimationFrame 确保在下一帧渲染时滚动
    requestAnimationFrame(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
        chatBox.scrollTop = chatBox.scrollHeight;
    });
}

// 移除所有与侧边栏缩放相关的事件监听
document.addEventListener('DOMContentLoaded', function () {
    // 阻止侧边栏的滚轮缩放
    const sidebar = document.querySelector('.sidebar');
    sidebar.addEventListener('wheel', function (e) {
        if (e.ctrlKey) {
            e.preventDefault();
        }
    }, { passive: false });

    // 阻止侧边栏内容的滚轮缩放
    const sidebarContent = document.querySelector('.sidebar-content');
    sidebarContent.addEventListener('wheel', function (e) {
        if (e.ctrlKey) {
            e.preventDefault();
        }
    }, { passive: false });
});

// 添加按钮点击事件
sendButton.addEventListener('click', function () {
    if (isGenerating) {
        // 如果正在生成，则停止
        controller.abort();  // 中止请求
        resetSendButton();  // 重置按钮状态
    } else {
        // 如果不在生成，则发送消息
        sendMessage();
    }
});

// 修改输入框事件监听
userInput.addEventListener('input', function () {
    // 当输入框有内容时启用按钮
    if (this.value.trim()) {
        sendButton.style.opacity = '1';
        sendButton.style.cursor = 'pointer';
    } else {
        sendButton.style.opacity = '0.5';
        sendButton.style.cursor = 'default';
    }
});

function createCodeHeader(codeBlock, language) {
    const header = document.createElement('div');
    header.className = 'code-header';

    // 添加语言标题
    const languageSpan = document.createElement('span');
    languageSpan.className = 'code-language';
    languageSpan.textContent = language || 'plaintext';

    // 添加复制按钮
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.innerHTML = '复制';
    copyButton.onclick = async () => {
        try {
            await navigator.clipboard.writeText(codeBlock.textContent);
            copyButton.innerHTML = '已复制!';
            copyButton.classList.add('copied');
            setTimeout(() => {
                copyButton.innerHTML = '复制';
                copyButton.classList.remove('copied');
            }, 2000);
        } catch (err) {
            console.error('复制失败:', err);
        }
    };

    header.appendChild(languageSpan);
    header.appendChild(copyButton);

    // 将header插入到pre元素的最前面
    const preElement = codeBlock.parentElement;
    preElement.insertBefore(header, preElement.firstChild);
}
