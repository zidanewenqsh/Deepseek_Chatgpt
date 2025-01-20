from flask import request, jsonify, Response, render_template
from app import app, client

# 主页路由
@app.route('/')  # 装饰器：处理根URL的请求
@app.route('/index')  # 同一个视图函数可以处理多个URL规则
def index():
    """
    处理主页请求
    返回渲染后的index.html模板
    title参数将被传递到模板中，用于设置页面标题
    """
    return render_template('index.html', title='AI Chat')

# 聊天接口路由
@app.route('/chat', methods=['POST'])  # 只接受POST请求
def chat():
    """
    处理聊天请求的主函数
    使用Server-Sent Events(SSE)实现流式响应
    """
    try:
        # 基本消息验证
        user_message = request.json.get('message')
        if not user_message:
            return jsonify({'error': '消息不能为空'}), 400
        
        def generate():
            """
            生成器函数：用于流式返回AI响应
            使用SSE格式：每条消息以 "data: " 开头，以 "\n\n" 结尾
            """
            try:
                # 使用 DeepSeek API
                response = client.chat.completions.create(
                    model="deepseek-chat",  # 使用的AI模型
                    messages=[
                        {"role": "user", "content": user_message}  # 设置用户角色和消息内容
                    ],
                    stream=True,  # 启用流式响应
                    temperature=0.7  # 控制响应的随机性：0表示最确定，1表示最随机
                )
                
                # 逐条处理AI的响应
                for event in response:
                    if event.choices:  # 如果有选择项
                        delta = event.choices[0].delta  # 获取第一个选择项的增量内容
                        if delta.content:  # 如果有内容更新
                            # 按SSE格式返回数据
                            yield f"data: {delta.content}\n\n"
                            
            except Exception as e:
                # 处理AI接口调用过程中的错误
                print('DeepSeek API Error:', str(e))  # 在服务器端打印错误信息
                yield f"data: [ERROR] {str(e)}\n\n"  # 向客户端发送错误信息
            
        # 返回流式响应
        # mimetype='text/event-stream' 告诉浏览器这是一个事件流
        return Response(
            generate(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                # 'X-Accel-Buffering': 'no'
            }
        )
        
    except Exception as e:
        # 处理主函数中的错误（如JSON解析错误等）
        print('Request Error:', str(e))  # 在服务器端打印错误信息
        # 返回JSON格式的错误响应，HTTP状态码500
        return jsonify({'error': str(e)}), 500
