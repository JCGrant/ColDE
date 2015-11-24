from flask import render_template, redirect, flash, url_for, g
from flask.ext.login import login_user, logout_user, current_user, login_required
from app import app, db, lm
from .models import User
from .forms import LoginForm

@lm.user_loader
def load_user(id):
    return User.query.get(int(id))

@app.before_request
def before_request():
    g.user = current_user

@app.route('/login', methods=['GET', 'POST'])
def login():
    if g.user is not None and g.user.is_authenticated:
        return redirect(url_for('home'))
    form = LoginForm()
    if form.validate_on_submit():
        username = form.username.data
        password = form.password.data
        user = User.query.filter_by(username=username).first()
        if user is None:
            user = User(username=username, password=password)
            db.session.add(user)
            db.session.commit()
        if user.check_password(password):
            login_user(user, remember=True)
            return redirect(url_for('home'))
    return render_template('login.html',
                           form=form)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('home'))

@app.route('/home')
@login_required
def home():
    return '<p>home<p>'

@app.route('/project/<int:id>')
@login_required
def project():
    return render_template('project.html')
