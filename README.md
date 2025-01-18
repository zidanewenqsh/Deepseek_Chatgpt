# Deepseek_Chatgpt
我用 Deepseek 实现一个 ChatGPT 的案例。

## 项目简介
本项目是一个基于 Flask 的聊天应用，使用 Deepseek API 作为后端 AI 助手。用户可以通过网页界面与 AI 进行对话，AI 将以中文回答用户的问题，并支持 Markdown 格式的输出。

## 功能特性
- **实时聊天**：用户可以输入问题，AI 将实时返回答案。
- **Markdown 支持**：AI 的回答支持 Markdown 格式，便于展示代码、列表和数学公式。
- **历史记录**：用户的聊天记录将被保存，方便后续查看。
- **搜索功能**：用户可以在历史记录中搜索特定的对话内容。

## 技术栈
- **后端**：Flask
- **前端**：HTML, CSS, JavaScript
- **依赖库**：
  - Flask
  - Flask-CORS
  - Requests
  - Python-Dotenv

## 环境配置
1. 克隆项目：
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. 创建虚拟环境并激活：
   ```bash
   python -m venv venv
   source venv/bin/activate  # 在 Windows 上使用 venv\Scripts\activate
   ```

3. 安装依赖：
   ```bash
   pip install -r requirements.txt
   ```

4. 配置环境变量：
   在项目根目录下创建一个 `.env` 文件，并添加以下内容：
   ```env
   DEEPSEEK_API_KEY=your_api_key_here  # 请填写您自己的 API 密钥
   BASE_URL=https://api.deepseek.com
   ```

## 启动项目
在终端中运行以下命令启动 Flask 应用：
```bash
python app.py
```
然后在浏览器中访问 `http://127.0.0.1:5000`。

## 使用说明
- 在聊天框中输入问题并按下 Enter 键发送。
- AI 将以中文回答，并支持 Markdown 格式的输出。
- 用户可以通过点击侧边栏查看历史记录和进行搜索。

## 贡献
欢迎任何形式的贡献！请提交 Pull Request 或者在 Issues 中提出建议。

## 许可证
本项目采用 MIT 许可证，详情请查看 [LICENSE](LICENSE) 文件。