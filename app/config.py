import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key'
    DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY") 