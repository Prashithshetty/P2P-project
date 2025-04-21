import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    # Flask configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'hard-to-guess-string'
    
    # MongoDB configuration
    MONGO_URI = os.environ.get('MONGO_URI') or 'mongodb://localhost:27017/p2pchat'
    
    # Flask-Login configuration
    LOGIN_VIEW = 'auth.login'
    
    # CORS configuration
    CORS_ORIGINS = '*'
