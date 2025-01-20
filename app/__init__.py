from flask import Flask
from openai import OpenAI
from app.config import Config

app = Flask(__name__)
app.config.from_object(Config)

# 初始化 OpenAI 客户端
client = OpenAI(
    api_key=app.config['DEEPSEEK_API_KEY'],
    base_url="https://api.deepseek.com"
)

from app import routes
