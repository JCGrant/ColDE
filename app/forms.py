from flask.ext.wtf import Form
from wtforms import StringField, PasswordField
from wtforms.validators import DataRequired
from app.models import User
from flask import flash

class LoginForm(Form):
    username = StringField('username', validators=[DataRequired()])
    password = PasswordField('password', validators=[DataRequired()])

    def __init__(self, *args, **kwargs):
        Form.__init__(self, *args, **kwargs)
        self.user = None

    def validate(self):
        rv = Form.validate(self)
        if not rv:
            return False

        user = User.query.filter_by(username=self.username.data).first()
        if user is None:
        	flash('Username does not exist')
        	self.username.errors.append('Username does not exist')
        	return False

        if not user.check_password(self.password.data):
        	flash('Invalid Password')
        	self.password.errors.append('Invalid Password')
        	return False

        self.user = user
        return True

class RegisterForm(Form):
    username = StringField('username', validators=[DataRequired()])
    password = PasswordField('password', validators=[DataRequired()])
    password2 = PasswordField('rpassword', validators=[DataRequired()])

    def __init__(self, *args, **kwargs):
        Form.__init__(self, *args, **kwargs)
        self.user = None

    def validate(self):
        rv = Form.validate(self)
        if not rv:
            return False

        user = User.query.filter_by(username=self.username.data).first()
        if user is not None:
        	flash('Username already in use')
        	self.username.errors.append('Username already in use')
        	return False

        if not self.password.data == self.password2.data:
        	flash('Passwords do not match')
        	self.password.errors.append('Passwords do not match')
        	return False

        self.user = user
        return True
