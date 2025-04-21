from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.utils import secure_filename
from models import User
from datetime import datetime
import os

api = Blueprint('api', __name__)

@api.route('/register', methods=['POST'])
def register():
    """API endpoint for user registration"""
    if request.is_json:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        # Check if username or email already exists
        existing_user_by_username = User.get_by_username(username)
        existing_user_by_email = User.get_by_email(email)
        
        if existing_user_by_username:
            return jsonify({
                'success': False,
                'message': 'Username already exists'
            }), 400
            
        if existing_user_by_email:
            return jsonify({
                'success': False,
                'message': 'Email already registered'
            }), 400
        
        # Create new user
        user = User(username=username, email=email, password=password)
        user.save()
        
        return jsonify({
            'success': True,
            'message': 'Registration successful',
            'user': {
                'id': str(user._id),
                'username': user.username,
                'email': user.email
            }
        })
    
    return jsonify({
        'success': False,
        'message': 'Invalid request format'
    }), 400

@api.route('/login', methods=['POST'])
def login():
    """API endpoint for user login"""
    if request.is_json:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        remember = data.get('remember', False)
        
        user = User.get_by_email(email)
        
        if user and user.check_password(password):
            login_user(user, remember=remember)
            
            # Update last login time
            user.last_login = datetime.utcnow()
            user.save()
            
            return jsonify({
                'success': True,
                'message': 'Login successful',
                'user_id': str(user._id),
                'username': user.username,
                'email': user.email,
                'profile_picture': user.profile_picture,
                'display_name': user.display_name,
                'bio': user.bio,
                'status': user.status,
                'token': 'dummy-token'  # In a real app, generate a proper JWT token
            })
        
        return jsonify({
            'success': False,
            'message': 'Invalid email or password'
        }), 401
    
    return jsonify({
        'success': False,
        'message': 'Invalid request format'
    }), 400

@api.route('/logout', methods=['POST'])
@login_required
def logout():
    """API endpoint for user logout"""
    logout_user()
    
    return jsonify({
        'success': True,
        'message': 'Logout successful'
    })

@api.route('/check-username', methods=['GET'])
def check_username():
    """API endpoint to check username availability"""
    username = request.args.get('username')
    if not username:
        return jsonify({
            'success': False,
            'message': 'Username parameter is required'
        }), 400
    
    user = User.get_by_username(username)
    return jsonify({'available': user is None})

@api.route('/check-email', methods=['GET'])
def check_email():
    """API endpoint to check email availability"""
    email = request.args.get('email')
    if not email:
        return jsonify({
            'success': False,
            'message': 'Email parameter is required'
        }), 400
    
    user = User.get_by_email(email)
    return jsonify({'available': user is None})

@api.route('/profile', methods=['GET'])
@login_required
def get_profile():
    """API endpoint to get user profile"""
    return jsonify({
        'id': str(current_user._id),
        'username': current_user.username,
        'email': current_user.email,
        'profile_picture': current_user.profile_picture,
        'display_name': current_user.display_name,
        'bio': current_user.bio,
        'status': current_user.status
    })

@api.route('/profile', methods=['PUT'])
@login_required
def update_profile():
    """API endpoint to update user profile"""
    if request.is_json:
        data = request.get_json()
        
        # Update fields that are provided
        if 'username' in data and data['username'] != current_user.username:
            # Check if username is available
            existing_user = User.get_by_username(data['username'])
            if existing_user and str(existing_user._id) != str(current_user._id):
                return jsonify({
                    'success': False,
                    'message': 'Username already exists'
                }), 400
            
            current_user.username = data['username']
        
        if 'email' in data and data['email'] != current_user.email:
            # Check if email is available
            existing_user = User.get_by_email(data['email'])
            if existing_user and str(existing_user._id) != str(current_user._id):
                return jsonify({
                    'success': False,
                    'message': 'Email already registered'
                }), 400
            
            current_user.email = data['email']
            
        # Update profile fields
        if 'display_name' in data:
            current_user.display_name = data['display_name']
        if 'bio' in data:
            current_user.bio = data['bio']
        if 'status' in data:
            current_user.status = data['status']
        
        # Save changes
        current_user.save()
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'user': {
                'id': str(current_user._id),
                'username': current_user.username,
                'email': current_user.email,
                'profile_picture': current_user.profile_picture,
                'display_name': current_user.display_name,
                'bio': current_user.bio,
                'status': current_user.status
            }
        })
    
    return jsonify({
        'success': False,
        'message': 'Invalid request format'
    }), 400

@api.route('/change-password', methods=['POST'])
@login_required
def change_password():
    """API endpoint to change user password"""
    if request.is_json:
        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({
                'success': False,
                'message': 'Current password and new password are required'
            }), 400
        
        # Verify current password
        if not current_user.check_password(current_password):
            return jsonify({
                'success': False,
                'message': 'Current password is incorrect'
            }), 401
        
        # Update password
        current_user.set_password(new_password)
        current_user.save()
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        })
    
    return jsonify({
        'success': False,
        'message': 'Invalid request format'
    }), 400

@api.route('/upload-profile-picture', methods=['POST'])
@login_required
def upload_profile_picture():
    """API endpoint to upload profile picture"""
    if 'profile_picture' not in request.files:
        return jsonify({
            'success': False,
            'message': 'No file part'
        }), 400
        
    file = request.files['profile_picture']
    
    if file.filename == '':
        return jsonify({
            'success': False,
            'message': 'No selected file'
        }), 400
        
    if file and allowed_file(file.filename):
        # Generate a secure filename
        filename = secure_filename(file.filename)
        # Add timestamp to make filename unique
        filename = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{filename}"
        
        # Create uploads directory if it doesn't exist
        os.makedirs('static/uploads/profile_pictures', exist_ok=True)
        
        # Save the file
        file_path = os.path.join('static/uploads/profile_pictures', filename)
        file.save(file_path)
        
        # Update user profile picture URL
        current_user.profile_picture = f"/static/uploads/profile_pictures/{filename}"
        current_user.save()
        
        return jsonify({
            'success': True,
            'message': 'Profile picture uploaded successfully',
            'profile_picture_url': current_user.profile_picture
        })
    
    return jsonify({
        'success': False,
        'message': 'File type not allowed'
    }), 400

# Helper function to check if file extension is allowed
def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
