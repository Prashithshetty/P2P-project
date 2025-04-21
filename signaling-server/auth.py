from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from urllib.parse import urlsplit
from werkzeug.utils import secure_filename
from models import User
from forms import LoginForm, RegistrationForm
import json
import os
from datetime import datetime

auth = Blueprint('auth', __name__)

@auth.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        if request.is_json:
            data = request.get_json()
            email = data.get('email')
            password = data.get('password')
            remember = data.get('remember', False)
        else:
            email = request.form.get('email')
            password = request.form.get('password')
            remember = request.form.get('remember', False)
        
        user = User.get_by_email(email)
        
        if user and user.check_password(password):
            login_user(user, remember=remember)
            next_page = request.args.get('next')
            if not next_page or urlsplit(next_page).netloc != '':
                next_page = url_for('index')
            
            if request.is_json:
                return jsonify({
                    'success': True,
                    'message': 'Login successful',
                    'user': {
                        'id': str(user._id),
                        'username': user.username,
                        'email': user.email
                    }
                })
            return redirect(next_page)
        
        if request.is_json:
            return jsonify({
                'success': False,
                'message': 'Invalid email or password'
            }), 401
        
        flash('Invalid email or password')
    
    form = LoginForm()
    return render_template('login.html', form=form)

@auth.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        if request.is_json:
            data = request.get_json()
            username = data.get('username')
            email = data.get('email')
            password = data.get('password')
        else:
            username = request.form.get('username')
            email = request.form.get('email')
            password = request.form.get('password')
        
        # Check if username or email already exists
        existing_user_by_username = User.get_by_username(username)
        existing_user_by_email = User.get_by_email(email)
        
        if existing_user_by_username or existing_user_by_email:
            if existing_user_by_username:
                message = 'Username already exists'
            else:
                message = 'Email already registered'
                
            if request.is_json:
                return jsonify({
                    'success': False,
                    'message': message
                }), 400
            
            flash(message)
            return redirect(url_for('auth.register'))
        
        # Create new user
        user = User(username=username, email=email, password=password)
        user.save()
        
        if request.is_json:
            return jsonify({
                'success': True,
                'message': 'Registration successful',
                'user': {
                    'id': str(user._id),
                    'username': user.username,
                    'email': user.email
                }
            })
        
        flash('Registration successful! Please log in.')
        return redirect(url_for('auth.login'))
    
    form = RegistrationForm()
    return render_template('register.html', form=form)

@auth.route('/logout')
@login_required
def logout():
    logout_user()
    
    if request.is_json:
        return jsonify({
            'success': True,
            'message': 'Logout successful'
        })
    
    return redirect(url_for('index'))

@auth.route('/check-username/<username>')
def check_username(username):
    user = User.get_by_username(username)
    return jsonify({'available': user is None})

@auth.route('/check-email/<email>')
def check_email(email):
    user = User.get_by_email(email)
    return jsonify({'available': user is None})

@auth.route('/user')
@login_required
def user_info():
    return jsonify({
        'id': str(current_user._id),
        'username': current_user.username,
        'email': current_user.email,
        'profile_picture': current_user.profile_picture,
        'display_name': current_user.display_name,
        'bio': current_user.bio,
        'status': current_user.status
    })

@auth.route('/profile', methods=['GET', 'PUT'])
@login_required
def profile():
    if request.method == 'GET':
        return jsonify({
            'id': str(current_user._id),
            'username': current_user.username,
            'email': current_user.email,
            'profile_picture': current_user.profile_picture,
            'display_name': current_user.display_name,
            'bio': current_user.bio,
            'status': current_user.status
        })
    elif request.method == 'PUT':
        data = request.get_json()
        
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

@auth.route('/upload-profile-picture', methods=['POST'])
@login_required
def upload_profile_picture():
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
