from flask import render_template, redirect, flash, url_for, g, request
from flask.ext.login import login_user, logout_user, current_user, login_required
from app import app, db, lm
from .models import User, Project, Pad
from .forms import LoginForm

@lm.user_loader
def load_user(id):
    return User.query.get(int(id))

@app.before_request
def before_request():
    g.user = current_user

@app.route('/register', methods=['GET', 'POST'])
def register():
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
            login_user(user, remember=True)
            return redirect(url_for('home'))
    return render_template('login.html',
                           form=form, title='Register')



@app.route('/login', methods=['GET', 'POST'])
def login():
    if g.user is not None and g.user.is_authenticated:
        return redirect(url_for('home'))
    form = LoginForm()
    if form.validate_on_submit():
        username = form.username.data
        password = form.password.data
        user = User.query.filter_by(username=username).first()
        if user is not None and user.check_password(password):
            login_user(user, remember=True)
            return redirect(url_for('home'))
    return render_template('login.html',
                           form=form, title='Sign In')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('home'))

@app.route('/')
@login_required
def home():
    return render_template('home.html', user=g.user)

@app.route('/project/new', methods=['GET'])
@login_required
def new_project():
    title = request.args.get('title', 'New Project')
    project = Project(title)
    project.users.append(g.user)
    db.session.add(project)
    db.session.commit()
    return redirect(url_for('project', id=project.id))

@app.route('/project/<int:id>')
@login_required
def project(id):
    project = Project.query.get(id)
    if project is None or g.user not in project.users:
        return redirect(url_for('home'))
    return render_template('project.html', project=project)

@app.route('/pad/new', methods=['GET'])
@login_required
def new_pad():
    filename = request.args.get('filename', 'new_file')
    project_id = request.args.get('project_id', '')
    project = Project.query.get(int(project_id))
    if project is None:
        return redirect(url_for('home'))
    pad = Pad(filename, project)
    db.session.add(pad)
    db.session.commit()
    return redirect(url_for('project', id=project.id)) 
