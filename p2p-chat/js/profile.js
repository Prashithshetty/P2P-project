document.addEventListener('DOMContentLoaded', function() {
    if (!isLoggedIn()) {
        document.getElementById('login-required').classList.remove('hidden');
        return;
    }
    
    const profilePictureContainer = document.querySelector('.profile-picture-container');
    const profilePicture = document.getElementById('profile-picture');
    const profilePictureInput = document.getElementById('profile-picture-input');
    const usernameInput = document.getElementById('username');
    const displayNameInput = document.getElementById('display-name');
    const emailInput = document.getElementById('email');
    const statusSelect = document.getElementById('status');
    const bioTextarea = document.getElementById('bio');
    const saveButton = document.getElementById('save-profile');
    const goToLoginButton = document.getElementById('go-to-login');
    
    loadUserProfile();
    
    profilePictureContainer.addEventListener('click', function() {
        profilePictureInput.click();
    });
    
    profilePictureInput.addEventListener('change', function(event) {
        if (event.target.files && event.target.files[0]) {
            uploadProfilePicture(event.target.files[0]);
        }
    });
    
    saveButton.addEventListener('click', saveProfile);
    
    goToLoginButton.addEventListener('click', function() {
        window.location.href = 'login.html';
    });
    
    async function loadUserProfile() {
        try {
            const userData = getUserData();
            
            usernameInput.value = userData.username || '';
            emailInput.value = userData.email || '';
            
            const response = await fetch('http://localhost:5000/api/profile', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userData.token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load profile data');
            }
            
            const profileData = await response.json();
            
            displayNameInput.value = profileData.display_name || '';
            statusSelect.value = profileData.status || 'Available';
            bioTextarea.value = profileData.bio || '';
            
            if (profileData.profile_picture) {
                updateProfilePictureDisplay(profileData.profile_picture);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            showNotification('Failed to load profile data', 'error');
        }
    }
    
    async function saveProfile() {
        try {
            const userData = getUserData();
            
            const profileData = {
                display_name: displayNameInput.value,
                status: statusSelect.value,
                bio: bioTextarea.value
            };
            
            const response = await fetch('http://localhost:5000/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userData.token}`
                },
                body: JSON.stringify(profileData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to update profile');
            }
            
            const result = await response.json();
            
            const updatedUserData = {
                ...userData,
                display_name: profileData.display_name,
                status: profileData.status,
                bio: profileData.bio
            };
            storeUserData(updatedUserData);
            
            showNotification('Profile updated successfully', 'success');
        } catch (error) {
            console.error('Error saving profile:', error);
            showNotification('Failed to update profile', 'error');
        }
    }
    
    async function uploadProfilePicture(file) {
        try {
            const userData = getUserData();
            
            const formData = new FormData();
            formData.append('profile_picture', file);
            
            const response = await fetch('http://localhost:5000/api/upload-profile-picture', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userData.token}`
                },
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Failed to upload profile picture');
            }
            
            const result = await response.json();
            
            updateProfilePictureDisplay(result.profile_picture_url);
            
            const updatedUserData = {
                ...userData,
                profile_picture: result.profile_picture_url
            };
            storeUserData(updatedUserData);
            
            showNotification('Profile picture updated successfully', 'success');
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            showNotification('Failed to upload profile picture', 'error');
        }
    }
    
    function updateProfilePictureDisplay(imageUrl) {
        profilePicture.innerHTML = '';
        
        const img = document.createElement('img');
        img.src = `http://localhost:5000${imageUrl}`;
        img.alt = 'Profile Picture';
        img.onerror = function() {
            profilePicture.innerHTML = '<i class="fas fa-user"></i>';
        };
        
        profilePicture.appendChild(img);
    }
    
    function showNotification(message, type = 'info') {
        const toast = document.getElementById('notification-toast');
        const messageElement = document.getElementById('notification-message');
        
        messageElement.textContent = message;
        toast.className = type;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
});
