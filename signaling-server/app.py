from flask import Flask, request, render_template_string, render_template, redirect, url_for, jsonify
from flask_socketio import SocketIO, emit, send, join_room, leave_room
from flask_cors import CORS
from flask_login import LoginManager, current_user, login_required
import time
import threading
import queue
import os
from datetime import datetime
from bson.objectid import ObjectId

from config import Config
from models import mongo, User, ChatSession, create_indexes
from auth import auth
from api import api

# Create uploads directory if it doesn't exist
os.makedirs('static/uploads/profile_pictures', exist_ok=True)

app = Flask(__name__, static_folder='static', static_url_path='/static')
app.config.from_object(Config)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize MongoDB
mongo.init_app(app)

# Initialize login manager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'

@login_manager.user_loader
def load_user(user_id):
    return User.get_by_id(user_id)

# Register blueprints
app.register_blueprint(auth, url_prefix='/auth')
app.register_blueprint(api, url_prefix='/api')

# Initialize data structures
connected_clients = {}  # Map of session_id to user_id
active_users = {}       # Map of user_id to username
log_messages = []
log_queue = queue.Queue()

# Create MongoDB indexes
with app.app_context():
    create_indexes()

# HTML template for the server page
HTML_TEMPLATE = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebRTC Signaling Server</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #333;
            margin-top: 0;
        }
        .status {
            margin-bottom: 20px;
            padding: 10px;
            background-color: #e9f7ef;
            border-radius: 4px;
        }
        .log-container {
            height: 400px;
            overflow-y: auto;
            background-color: #f8f9fa;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-family: monospace;
        }
        .log-entry {
            margin-bottom: 5px;
            padding: 5px;
            border-bottom: 1px solid #eee;
        }
        .timestamp {
            color: #666;
            margin-right: 10px;
        }
        .client-connected {
            color: #28a745;
        }
        .client-disconnected {
            color: #dc3545;
        }
        .signal {
            color: #007bff;
        }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.0.1/socket.io.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const socket = io();
            const logContainer = document.getElementById('log-container');
            
            socket.on('log_update', function(data) {
                const logEntry = document.createElement('div');
                logEntry.className = 'log-entry';
                
                const timestamp = document.createElement('span');
                timestamp.className = 'timestamp';
                timestamp.textContent = data.timestamp;
                
                const message = document.createElement('span');
                message.className = data.type;
                message.textContent = data.message;
                
                logEntry.appendChild(timestamp);
                logEntry.appendChild(message);
                logContainer.appendChild(logEntry);
                
                // Auto-scroll to bottom
                logContainer.scrollTop = logContainer.scrollHeight;
            });
            
            socket.on('status_update', function(data) {
                document.getElementById('connected-clients').textContent = data.clients;
            });
        });
    </script>
</head>
<body>
    <div class="container">
        <h1>WebRTC Signaling Server</h1>
        <div class="status">
            <p>Server Status: <strong>Running</strong></p>
            <p>Connected Clients: <strong id="connected-clients">{{ clients }}</strong></p>
        </div>
        <h2>Server Logs</h2>
        <div id="log-container" class="log-container">
            {% for log in logs %}
            <div class="log-entry">
                <span class="timestamp">{{ log.timestamp }}</span>
                <span class="{{ log.type }}">{{ log.message }}</span>
            </div>
            {% endfor %}
        </div>
    </div>
</body>
</html>
'''

def log_message(message, msg_type="info"):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    log_entry = {
        "timestamp": timestamp,
        "message": message,
        "type": msg_type
    }
    log_messages.append(log_entry)
    log_queue.put(log_entry)
    socketio.emit('log_update', log_entry)

@socketio.on('connect')
def handle_connect():
    client_id = request.sid
    log_message(f'Client attempting to connect. ID: {client_id}', "client-connected")
    
    # Authentication will be handled by the 'authenticate' event
    emit('status', {'message': 'Connected to server, authentication required'})

@socketio.on('authenticate')
def handle_authenticate(data):
    client_id = request.sid
    user_id = data.get('user_id')
    username = data.get('username')
    
    if not user_id or not username:
        emit('auth_error', {'message': 'Authentication failed: Missing user information'})
        return
    
    # Verify user exists
    user = User.get_by_id(user_id)
    if not user or user.username != username:
        emit('auth_error', {'message': 'Authentication failed: Invalid user'})
        return
    
    # Store client connection
    connected_clients[client_id] = user_id
    active_users[user_id] = username
    
    # Create chat session record
    session = ChatSession(session_id=client_id, user_id=user_id)
    session.save()
    
    log_message(f'Client authenticated. ID: {client_id}, User: {username}', "client-connected")
    
    # Notify client of successful authentication
    emit('authenticated', {
        'user_id': user_id,
        'username': username,
        'active_users': list(active_users.values())
    })
    
    # Broadcast to all clients about new user
    emit('user_joined', {
        'username': username,
        'active_users': list(active_users.values())
    }, broadcast=True)
    
    # Update server status
    socketio.emit('status_update', {'clients': len(connected_clients)})

@socketio.on('disconnect')
def handle_disconnect():
    client_id = request.sid
    
    if client_id in connected_clients:
        user_id = connected_clients[client_id]
        username = active_users.get(user_id, 'Unknown')
        
        # Update chat session record
        session = ChatSession.get_by_session_id(client_id)
        if session:
            session.disconnected_at = datetime.utcnow()
            session.is_active = False
            session.save()
        
        # Remove from active connections
        del connected_clients[client_id]
        if user_id in active_users:
            del active_users[user_id]
        
        log_message(f'Client disconnected. ID: {client_id}, User: {username}', "client-disconnected")
        
        # Broadcast to all clients about user leaving
        emit('user_left', {
            'username': username,
            'active_users': list(active_users.values())
        }, broadcast=True)
    else:
        log_message(f'Unauthenticated client disconnected. ID: {client_id}', "client-disconnected")
    
    # Update server status
    socketio.emit('status_update', {'clients': len(connected_clients)})

@socketio.on('signal')
def handle_signal(data):
    client_id = request.sid
    
    # Check if client is authenticated
    if client_id not in connected_clients:
        emit('auth_error', {'message': 'Authentication required'})
        return
    
    user_id = connected_clients[client_id]
    username = active_users.get(user_id, 'Unknown')
    
    # Add sender information to the signal
    data['sender'] = {
        'user_id': user_id,
        'username': username
    }
    
    log_message(f'Received signal from {username}: {data["type"]}', "signal")
    
    # If target is specified, send only to that user
    target_username = data.get('target')
    if target_username:
        # Find the target user's client ID
        target_user_id = None
        for uid, uname in active_users.items():
            if uname == target_username:
                target_user_id = uid
                break
        
        if target_user_id:
            # Find the target client ID
            target_client_id = None
            for cid, uid in connected_clients.items():
                if uid == target_user_id:
                    target_client_id = cid
                    break
            
            if target_client_id:
                emit('signal', data, room=target_client_id)
                return
    
    # Otherwise broadcast to all other clients
    emit('signal', data, broadcast=True, include_self=False)

@socketio.on('get_users')
def handle_get_users():
    client_id = request.sid
    
    # Check if client is authenticated
    if client_id not in connected_clients:
        emit('auth_error', {'message': 'Authentication required'})
        return
    
    emit('user_list', {'active_users': list(active_users.values())})

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE, logs=log_messages, clients=len(connected_clients))

@app.route('/api/users')
def get_users():
    return jsonify({
        'active_users': list(active_users.values())
    })

if __name__ == '__main__':
    log_message('Signaling server running on http://localhost:5000')
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
