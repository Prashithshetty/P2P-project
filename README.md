# P2P Chat Application

A secure, peer-to-peer messaging application that enables real-time communication between users through WebRTC technology.

## Overview

P2P Chat is a web-based chat application that uses WebRTC for direct peer-to-peer communication between users. The application consists of two main components:

1. **Frontend (p2p-chat)**: A responsive web interface built with HTML, CSS, and JavaScript
2. **Backend (signaling-server)**: A Flask-based server that handles user authentication and WebRTC signaling

The application uses a peer-to-peer architecture for message exchange, ensuring that chat messages are sent directly between users without passing through a central server, enhancing privacy and security.

## Features

- **Secure Authentication**: User registration and login system
- **Real-time Messaging**: Direct peer-to-peer communication
- **User Profiles**: Customizable profiles with display names, bios, and profile pictures
- **User Status**: See when users are online and available to chat
- **Responsive Design**: Works on desktop and mobile devices
- **End-to-End Communication**: Messages are sent directly between peers

## Architecture

### Frontend (p2p-chat)

The frontend is built with vanilla HTML, CSS, and JavaScript, organized as follows:

- **HTML Pages**:
  - `index.html`: Main chat interface
  - `login.html`: Authentication page (login/register)
  - `profile.html`: User profile management

- **JavaScript Modules**:
  - `auth.js`: Handles user authentication and session management
  - `webrtc.js`: Manages WebRTC connections and data channels
  - `main.js`: Main application logic
  - `ui.js`: UI-related functionality
  - `profile.js`: Profile management functionality

- **CSS Styles**:
  - `main.css`: Styles for the main chat interface
  - `login.css`: Styles for the login/register page
  - `profile.css`: Styles for the profile page

### Backend (signaling-server)

The backend is built with Flask and uses MongoDB for data storage:

- **Core Components**:
  - `app.py`: Main Flask application and WebSocket server
  - `models.py`: Database models (User, ChatSession)
  - `auth.py`: Authentication routes and logic
  - `api.py`: API endpoints

- **Technologies**:
  - Flask: Web framework
  - Flask-SocketIO: WebSocket support for signaling
  - Flask-PyMongo: MongoDB integration
  - Flask-Login: User session management

## WebRTC Implementation

The application uses WebRTC for peer-to-peer communication:

1. **Signaling**: The Flask server acts as a signaling server to exchange connection information between peers
2. **ICE Candidates**: Uses STUN servers to establish the most efficient connection path
3. **Data Channels**: Once connected, peers communicate through WebRTC data channels

## Setup and Installation

### Prerequisites

- Python 3.8+
- MongoDB
- Node.js (optional, for development)

### Backend Setup

1. Navigate to the signaling-server directory:
   ```
   cd signaling-server
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

4. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

5. Set up environment variables (create a `.env` file):
   ```
   SECRET_KEY=your_secret_key
   MONGO_URI=mongodb://localhost:27017/p2p_chat
   ```

6. Run the server:
   ```
   python app.py
   ```

### Frontend Setup

The frontend is static HTML/CSS/JS and can be served directly from the file system or using a simple HTTP server:

1. Using Python's built-in HTTP server:
   ```
   cd p2p-chat
   python -m http.server 8000
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

## Usage

1. Register a new account or log in with existing credentials
2. Update your profile information (optional)
3. Connect with other users by entering their username
4. Start chatting in real-time

## Security Considerations

- All chat messages are sent directly between peers (P2P)
- The server only facilitates the initial connection (signaling)
- User passwords are securely hashed before storage
- WebRTC connections use secure protocols

## Future Enhancements

- End-to-end encryption for messages
- File sharing capabilities
- Group chat functionality
- Voice and video calling
- Offline message storage and delivery

## License

[MIT License](LICENSE)

## Acknowledgements

- WebRTC technology
- Flask framework
- MongoDB
- Socket.IO
