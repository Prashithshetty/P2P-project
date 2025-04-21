function storeUserData(userData) {
    localStorage.setItem('p2p_chat_user', JSON.stringify(userData));
}

function getUserData() {
    const userData = localStorage.getItem('p2p_chat_user');
    if (userData) {
        try {
            return JSON.parse(userData);
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    }
    return null;
}

function isLoggedIn() {
    return !!getUserData();
}

function clearUserData() {
    localStorage.removeItem('p2p_chat_user');
}

async function registerUser(username, email, password) {
    try {
        const response = await fetch('http://localhost:5000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        return data;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

async function loginUser(email, password, remember = false) {
    try {
        const response = await fetch('http://localhost:5000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                remember
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        storeUserData({
            id: data.user_id,
            username: data.username,
            email: data.email,
            profile_picture: data.profile_picture,
            display_name: data.display_name,
            bio: data.bio,
            status: data.status,
            token: data.token
        });

        return data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

async function logoutUser() {
    try {
        const userData = getUserData();
        if (!userData || !userData.token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch('http://localhost:5000/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userData.token}`
            }
        });

        clearUserData();

        if (!response.ok) {
            const data = await response.json();
            console.warn('Logout warning:', data.message);
        }

        return true;
    } catch (error) {
        console.error('Logout error:', error);
        clearUserData();
        throw error;
    }
}

async function checkUsernameAvailability(username) {
    try {
        const response = await fetch(`http://localhost:5000/api/check-username?username=${encodeURIComponent(username)}`);
        const data = await response.json();
        return data.available;
    } catch (error) {
        console.error('Error checking username:', error);
        throw error;
    }
}

async function checkEmailAvailability(email) {
    try {
        const response = await fetch(`http://localhost:5000/api/check-email?email=${encodeURIComponent(email)}`);
        const data = await response.json();
        return data.available;
    } catch (error) {
        console.error('Error checking email:', error);
        throw error;
    }
}

async function updateUserProfile(userData) {
    try {
        const currentUser = getUserData();
        if (!currentUser || !currentUser.token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch('http://localhost:5000/api/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Profile update failed');
        }

        const updatedUser = {
            ...currentUser,
            ...userData
        };
        storeUserData(updatedUser);

        return data;
    } catch (error) {
        console.error('Profile update error:', error);
        throw error;
    }
}

async function changePassword(currentPassword, newPassword) {
    try {
        const userData = getUserData();
        if (!userData || !userData.token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch('http://localhost:5000/api/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userData.token}`
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Password change failed');
        }

        return data;
    } catch (error) {
        console.error('Password change error:', error);
        throw error;
    }
}
