document.addEventListener('DOMContentLoaded', function() {
    console.log('P2P Chat Application Initialized');
    
    if (!isLoggedIn()) {
        document.getElementById('login-required').classList.remove('hidden');
        return;
    }
    
    const user = getUserData();
    if (user) {
        console.log('User logged in:', user.username);
        
        document.getElementById('username').textContent = user.username;
        document.getElementById('user-email').textContent = user.email;
        
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            userAvatar.innerHTML = user.username.charAt(0).toUpperCase();
        }
    }
    
    window.addEventListener('beforeunload', function(e) {
        if (dataChannel && dataChannel.readyState === 'open') {
            const confirmationMessage = 'You have an active chat. Are you sure you want to leave?';
            e.returnValue = confirmationMessage;
            return confirmationMessage;
        }
    });
});
