from flask import Flask
from models import mongo, User
import json

app = Flask(__name__)
app.config['MONGO_URI'] = 'mongodb://localhost:27017/p2pchat'
mongo.init_app(app)

with app.app_context():
    # Check if the user exists
    user = User.get_by_username('testuser')
    if user:
        print(f"User found: {user}")
        print(f"Username: {user.username}")
        print(f"Email: {user.email}")
        print(f"Password hash: {user.password_hash}")
        print(f"Is active: {user.is_active}")
    else:
        print("User 'testuser' not found")
        
    # List all users
    print("\nAll users:")
    users = mongo.db.users.find()
    for user_data in users:
        # Convert ObjectId to string for JSON serialization
        user_data['_id'] = str(user_data['_id'])
        print(json.dumps(user_data, indent=2, default=str))
