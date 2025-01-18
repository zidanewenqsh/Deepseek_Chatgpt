from flask import Flask, request, jsonify, send_file
from openai import OpenAI
from dotenv import load_dotenv
import os

# 加载环境变量配置
load_dotenv()  # 从.env文件中加载环境变量
api_key = os.getenv("DEEPSEEK_API_KEY")  # 获取API密钥

# 初始化Flask应用
app = Flask(__name__)

# 初始化OpenAI客户端
# 使用deepseek的API地址，因为deepseek的API与OpenAI兼容
client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")

# 定义AI助手的系统提示信息
# 这些信息会指导AI如何回答问题
SYSTEM_MESSAGE = """You are an AI expert, answer in Chinese and markdown format. Follow these formatting rules:
1. Use proper indentation for code blocks
2. Break long paragraphs into shorter ones for better readability
3. Add line breaks after every main point
4. When showing code, always specify the language after triple backticks
5. Keep lines under 80 characters when possible
6. Use proper markdown formatting for lists and headings
7. For mathematical formulas:
   - Use single $ for inline math expressions (e.g., $E=mc^2$)
   - Use double $$ for block math expressions
   - Always use proper LaTeX syntax"""

# 路由：处理根路径的访问
@app.route('/')
def home():
    """提供网页界面"""
    return send_file('index.html')  # 返回主页HTML文件

# 路由：处理聊天请求
@app.route('/chat', methods=['POST'])
def chat():
    """处理聊天请求的主要函数"""
    try:
        # 获取用户发送的消息
        message = request.json.get('message', '')
        if not message:
            # 如果没有收到消息，返回错误
            return jsonify({'error': 'No message provided'}), 400
        
        # 调用DeepSeek API进行对话
        response = client.chat.completions.create(
            model="deepseek-chat",  # 使用的模型
            messages=[
                # 系统提示，设定AI的行为规则
                {"role": "system", "content": SYSTEM_MESSAGE},
                # 用户的实际问题
                {"role": "user", "content": message}
            ],
            stream=True,  # 启用流式响应
            temperature=0.7  # 控制回答的随机性，0.7表示适中的创造性
        )
        
        # 收集流式响应的内容
        full_response = ""
        for event in response:
            if event.choices:
                delta = event.choices[0].delta
                if delta.content:
                    # 累积响应内容
                    full_response += delta.content
                    # 实时打印响应，方便调试
                    print(delta.content, end="")
        
        # 返回完整的响应内容
        return jsonify({'response': full_response})
        
    except Exception as e:
        # 错误处理
        print('Error:', str(e))  # 打印错误信息，方便调试
        return jsonify({'error': str(e)}), 500  # 返回错误信息给前端

# 程序入口
if __name__ == '__main__':
    # 启动Flask应用
    # debug=True 启用调试模式，方便开发
    app.run(debug=True)
