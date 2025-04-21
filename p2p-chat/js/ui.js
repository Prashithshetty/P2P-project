function updateStatus(status) {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
        statusElement.textContent = status;
    }
}

function formatTime() {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    
    return hours + ':' + minutes + ' ' + ampm;
}

function displaySystemMessage(message) {
    const systemMessagesDiv = document.getElementById('system-messages');
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.classList.add('system-message');
    systemMessagesDiv.appendChild(messageElement);
    
    const chatArea = document.getElementById('chat-area');
    chatArea.scrollTop = chatArea.scrollHeight;
}

function displayMessage(message) {
    const messagesDiv = document.getElementById('messages');
    const messageElement = document.createElement('div');
    
    const messageContent = document.createElement('span');
    messageContent.textContent = message;
    
    const timeElement = document.createElement('div');
    timeElement.classList.add('message-time');
    timeElement.textContent = formatTime();
    
    messageElement.classList.add('message');
    if (message.startsWith('You: ')) {
        messageElement.classList.add('sent-message');
        messageContent.textContent = message.substring(5);
    } else if (message.startsWith('Peer: ')) {
        messageElement.classList.add('received-message');
        messageContent.textContent = message.substring(6);
    }
    
    messageElement.appendChild(messageContent);
    messageElement.appendChild(timeElement);
    
    messagesDiv.appendChild(messageElement);
    
    const chatArea = document.getElementById('chat-area');
    chatArea.scrollTop = chatArea.scrollHeight;
}

document.getElementById('send-button').addEventListener('click', function() {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    if (message) {
        sendMessage(message);
        messageInput.value = '';
    }
});

document.getElementById('message-input').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        const message = this.value.trim();
        if (message) {
            sendMessage(message);
            this.value = '';
        }
    }
});

document.getElementById('start-chat').addEventListener('click', function() {
    displaySystemMessage('Starting chat...');
    this.disabled = true;
    this.textContent = 'Connecting...';
    startChat();
});

function checkAuth() {
    const user = getUserData();
    if (!user) {
        document.getElementById('login-required').classList.remove('hidden');
        document.getElementById('go-to-login').addEventListener('click', function() {
            window.location.href = './login.html';
        });
        return false;
    }
    
    document.getElementById('username').textContent = user.display_name || user.username;
    document.getElementById('user-email').textContent = user.email;
    
    if (user.profile_picture) {
        updateProfilePicture(user.profile_picture);
    }
    
    return true;
}

function updateProfilePicture(imageUrl) {
    const profilePicture = document.getElementById('profile-picture');
    const userAvatar = document.getElementById('user-avatar');
    
    profilePicture.innerHTML = '';
    userAvatar.innerHTML = '';
    
    if (imageUrl) {
        const headerImg = document.createElement('img');
        headerImg.src = `http://localhost:5000${imageUrl}`;
        headerImg.alt = 'Profile Picture';
        headerImg.style.width = '100%';
        headerImg.style.height = '100%';
        headerImg.style.objectFit = 'cover';
        headerImg.style.borderRadius = '50%';
        
        const menuImg = headerImg.cloneNode(true);
        
        headerImg.onerror = function() {
            profilePicture.innerHTML = '<i class="fas fa-user"></i>';
        };
        
        menuImg.onerror = function() {
            userAvatar.innerHTML = '<i class="fas fa-user"></i>';
        };
        
        profilePicture.appendChild(headerImg);
        userAvatar.appendChild(menuImg);
    } else {
        profilePicture.innerHTML = '<i class="fas fa-user"></i>';
        userAvatar.innerHTML = '<i class="fas fa-user"></i>';
    }
}

document.getElementById('user-menu-button').addEventListener('click', function(e) {
    e.stopPropagation();
    document.getElementById('user-menu').classList.toggle('active');
});

document.addEventListener('click', function(e) {
    const menu = document.getElementById('user-menu');
    if (menu.classList.contains('active') && !e.target.closest('#user-menu') && !e.target.closest('#user-menu-button')) {
        menu.classList.remove('active');
    }
});

document.getElementById('chat-with-friend').addEventListener('click', function() {
    document.getElementById('friend-chat-modal').classList.remove('hidden');
    document.getElementById('friend-username-input').focus();
});

document.getElementById('close-friend-modal').addEventListener('click', function() {
    document.getElementById('friend-chat-modal').classList.add('hidden');
    document.getElementById('friend-username-input').value = '';
    document.getElementById('friend-username-error').classList.add('hidden');
});

document.getElementById('connect-to-friend').addEventListener('click', function() {
    connectToFriendByUsername();
});

document.getElementById('friend-username-input').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        connectToFriendByUsername();
    }
});

function connectToFriendByUsername() {
    const usernameInput = document.getElementById('friend-username-input');
    const username = usernameInput.value.trim();
    const errorElement = document.getElementById('friend-username-error');
    
    if (!username) {
        errorElement.textContent = 'Please enter a username';
        errorElement.classList.remove('hidden');
        return;
    }
    
    const currentUser = getUserData();
    if (username === currentUser.username) {
        errorElement.textContent = 'You cannot chat with yourself';
        errorElement.classList.remove('hidden');
        return;
    }
    
    document.getElementById('friend-chat-modal').classList.add('hidden');
    
    usernameInput.value = '';
    errorElement.classList.add('hidden');
    
    initiateChat(username);
}

document.getElementById('logout-button').addEventListener('click', function(e) {
    e.preventDefault();
    logoutUser().then(() => {
        window.location.href = './login.html';
    }).catch(error => {
        console.error('Logout error:', error);
        window.location.href = './login.html';
    });
});

document.getElementById('show-users-button').addEventListener('click', function() {
    document.getElementById('user-list-sidebar').classList.add('active');
});

document.getElementById('close-sidebar').addEventListener('click', function() {
    document.getElementById('user-list-sidebar').classList.remove('active');
});

document.getElementById('user-search-input').addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const userItems = document.querySelectorAll('.user-item');
    
    userItems.forEach(item => {
        const username = item.querySelector('.user-item-name').textContent.toLowerCase();
        if (username.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
});

function addUserToList(username, isOnline = true) {
    const usersList = document.getElementById('active-users-list');
    
    const existingUser = Array.from(usersList.querySelectorAll('.user-item')).find(
        item => item.querySelector('.user-item-name').textContent === username
    );
    
    if (existingUser) {
        const statusElement = existingUser.querySelector('.user-item-status');
        statusElement.textContent = isOnline ? 'Online' : 'Offline';
        statusElement.className = `user-item-status ${isOnline ? '' : 'offline'}`;
        return;
    }
    
    const userItem = document.createElement('div');
    userItem.className = 'user-item';
    userItem.dataset.username = username;
    
    const avatar = document.createElement('div');
    avatar.className = 'user-item-avatar';
    avatar.textContent = username.charAt(0).toUpperCase();
    
    const details = document.createElement('div');
    details.className = 'user-item-details';
    
    const nameElement = document.createElement('div');
    nameElement.className = 'user-item-name';
    nameElement.textContent = username;
    
    const statusElement = document.createElement('div');
    statusElement.className = `user-item-status ${isOnline ? '' : 'offline'}`;
    statusElement.textContent = isOnline ? 'Online' : 'Offline';
    
    details.appendChild(nameElement);
    details.appendChild(statusElement);
    userItem.appendChild(avatar);
    userItem.appendChild(details);
    
    userItem.addEventListener('click', function() {
        initiateChat(username);
        document.getElementById('user-list-sidebar').classList.remove('active');
    });
    
    usersList.appendChild(userItem);
}

function updateUsersList(users) {
    const usersList = document.getElementById('active-users-list');
    
    usersList.innerHTML = '';
    
    users.forEach(username => {
        addUserToList(username);
    });
}

function initiateChat(username) {
    document.getElementById('contact-name').textContent = username;
    document.getElementById('connection-status').textContent = 'Connecting...';
    
    document.getElementById('messages').innerHTML = '';
    document.getElementById('system-messages').innerHTML = '';
    
    displaySystemMessage(`Starting chat with ${username}...`);
    
    document.getElementById('message-input').disabled = false;
    document.getElementById('send-button').disabled = false;
    
    connectToPeer(username);
}

document.addEventListener('DOMContentLoaded', function() {
    if (!checkAuth()) return;
    
    fetch('/api/users')
        .then(response => response.json())
        .then(data => {
            updateUsersList(data.active_users);
        })
        .catch(error => {
            console.error('Error fetching users:', error);
        });
});
