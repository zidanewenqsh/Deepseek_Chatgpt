import { sendMessage, appendMessage, isGenerating, controller } from './chat.js';
import { setSendButtonToStop, resetSendButton, adjustInputHeight } from './ui.js';
import { saveToLocalStorage, loadChat, deleteChat } from './storage.js';
import { showSearch, closeSearch, performSearch } from './search.js';
import { isGenerating as stateIsGenerating, controller as stateController } from './state.js';

// 添加全局变量
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

// 初始化事件监听
document.addEventListener('DOMContentLoaded', function() {
    // 获取 DOM 元素
    const chatBox = document.getElementById('chatBox');
    const sendButton = document.getElementById('sendButton');
    const userInput = document.getElementById('userInput');

    if (!chatBox || !sendButton || !userInput) {
        console.error('必要的 DOM 元素未找到');
        return;
    }

    // 初始化发送按钮
    sendButton.addEventListener('click', function() {
        if (stateIsGenerating) {
            stateController.abort();
            resetSendButton();
        } else {
            sendMessage();
        }
    });

    // 初始化输入框
    
    // 添加输入事件监听
    userInput.addEventListener('input', function() {
        adjustInputHeight(this);
        if (this.value.trim()) {
            sendButton.style.opacity = '1';
            sendButton.style.cursor = 'pointer';
        } else {
            sendButton.style.opacity = '0.5';
            sendButton.style.cursor = 'default';
        }
    });

    // 添加键盘事件监听
    userInput.addEventListener('keydown', async function(e) {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                // Shift + Enter: 换行
                // 使用 setTimeout 确保在换行后调整高度
                setTimeout(() => adjustInputHeight(this), 0);
                return;
            } else {
                // Enter: 发送消息
                e.preventDefault();
                const text = this.value.trim();
                if (text) {
                    await sendMessage();
                }
            }
        }
    });

    // 其他初始化代码...
    updateChatHistory();
});

// 开始新的聊天会话
function startNewChat() {
    // 重置消息数组，包含系统提示
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

    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML = '';
    
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
    
    // 重置状态
    const userInput = document.getElementById('userInput');
    userInput.value = '';
    adjustInputHeight(userInput);
    
    const sendButton = document.getElementById('sendButton');
    sendButton.style.opacity = '0.5';
    sendButton.style.cursor = 'default';
    
    isNewChat = true;
    currentChatIndex = null;
    updateChatHistory();
}

// 切换侧边栏显示状态
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    // 切换侧边栏的显示状态
    sidebar.classList.toggle('hidden');
    
    // 调整主内容区域的边距
    if (sidebar.classList.contains('hidden')) {
        mainContent.style.marginLeft = '0';
    } else {
        mainContent.style.marginLeft = '250px'; // 根据侧边栏宽度调整
    }
}

// 更新聊天历史记录
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
            e.stopPropagation();
            deleteChat(chats.length - 1 - index);
        };

        chatItem.appendChild(titleDiv);
        chatItem.appendChild(deleteBtn);
        historyDiv.appendChild(chatItem);
    });
}

// 导出需要的函数和变量
export { 
    startNewChat, 
    toggleSidebar, 
    messages,
    isNewChat,
    currentChatIndex,
    stateIsGenerating 
}; 