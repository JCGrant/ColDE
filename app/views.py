from flask import render_template, redirect, flash, url_for, g, request, jsonify
from flask.ext.login import login_user, logout_user, current_user, login_required
from app import app, db, lm, socketio_server
from .models import User, Project, Pad
from .forms import LoginForm
import json
import re

tree_mappings = {}
tree_mappings[1] = "/"

@lm.user_loader
def load_user(id):
    return User.query.get(int(id))

@app.before_request
def before_request():
    g.user = current_user

@app.route('/register/', methods=['GET', 'POST'])
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

@app.route('/login/', methods=['GET', 'POST'])
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

@app.route('/logout/')
@login_required
def logout():
    logout_user()
    return redirect(url_for('home'))

@app.route('/')
@login_required
def home():
    return render_template('home.html', user=g.user)

@app.route('/project/new/', methods=['GET'])
@login_required
def new_project():
    title = request.args.get('title', 'New Project')
    project = Project(title)
    project.users.append(g.user)
    db.session.add(project)
    db.session.commit()
    return redirect(url_for('project', id=project.id))

@app.route('/project/<int:id>/')
@login_required
def project(id):
    project = Project.query.get(id)
    if project is None or g.user not in project.users:
        return redirect(url_for('home'))
    return render_template('project.html', 
                           project=project)

@app.route('/project/<int:id>/pad/new/', methods=['GET'])
@login_required
def new_pad(id):
    parent = request.args.get('parent', 1)  
    filename = request.args.get('filename', 'new_file')
    file_type = request.args.get('type', 'filenode')
    project = Project.query.get(id)
    if int(parent) != 1:
        filename = tree_mappings[int(parent)] + "/" + filename
    else:
        filename = tree_mappings[int(parent)] + filename
    pads_filenames = [pad.filename for pad in project.pads]    
    ct = 1
    while filename in pads_filenames:
        filename += "(" + str(ct) + ")"
        if filename not in pads_filenames:
            break
        l = - (len(str(ct)) + 2)
        filename = filename[:l]
        ct+=1
        
    # Check if valid project.
    if project is None:
        return redirect(url_for('home'))
    # Update DB.
    pad = Pad(filename, id)
    if file_type == 'filenode':
        pad.is_file = True
    db.session.add(pad)
    db.session.commit()
    # Let the other clients know.
    msg = {'projectId': id}
    msg['padId'], msg['filename'] = pad.id, pad.filename
    msg['text'], msg['baseRev'] = pad.text, pad.last_revision
    socketio_server.onFileManipulation('new', msg)
    return redirect(url_for('project', id=id))

@app.route('/project/<int:id>/pad/getPad', methods=['GET'])
@login_required
def get_pad(id):
    node_id = request.args.get('id', 1)
    project = Project.query.get(id)
    if project is None:
        return redirect(url_for('home'))
    filename = tree_mappings[int(node_id)]
    pad = project.pads.filter_by(filename=filename).first()
    result = {}
    if pad is None:
        result["id"] = -1
        return json.dumps(result) 
    result["id"] = pad.id
    result["filename"] = pad.filename
    result["text"] = pad.text;
    if not pad.is_file:
        result["id"] = -1
    return json.dumps(result)

@app.route('/project/<int:id>/users_not_in_project/')
@login_required
def get_non_users(id):
    project = Project.query.get(id)
    if project is None or g.user not in project.users:
        return redirect(url_for('home'))
    users = [u for u in User.query.all() if u not in project.users]
    user_dicts = {'users':
        [
            {
                'id': u.id,
                'username': u.username
            } for u in users]
    }
    return jsonify(user_dicts)

@app.route('/project/<int:id>/users/')
@login_required
def get_users(id):
    project = Project.query.get(id)
    current_user = request.args.get("user")
    if project is None or g.user not in project.users:
        return redirect(url_for('home'))
    users = [u for u in User.query.all() if u in project.users and u.username != current_user]
    user_dicts = {'users':
        [
            {
                'id': u.id,
                'username': u.username
            } for u in users]
    }
    return jsonify(user_dicts)

@app.route('/project/<int:id>/add_users/', methods=['GET'])
@login_required
def add_users(id):
    project = Project.query.get(id)
    if project is None or g.user not in project.users:
        return redirect(url_for('home'))
    usernames = request.args.getlist('username')
    for username in usernames:
        user = User.query.filter_by(username=username).first()
        project.users.append(user)
    db.session.commit()
    return redirect(url_for('project', id=id))

@app.route('/project/<int:id>/del_users/', methods=['GET'])
@login_required
def del_users(id):
    project = Project.query.get(id)
    if project is None or g.user not in project.users:
        return redirect(url_for('home'))
    usernames = request.args.getlist('username')
    for username in usernames:
        user = User.query.filter_by(username=username).first()
        project.users.remove(user)
    db.session.commit()
    return redirect(url_for('project', id=id))

@app.route('/project/<int:id>/leave_project', methods=['GET'])
@login_required
def leave_project(id):
    project = Project.query.get(id)
    if project is None or g.user not in project.users:
        return redirect(url_for('home'))
    username = request.args.get('username')
    user = User.query.filter_by(username=username).first()
    project.users.remove(user)
    db.session.commit()
    return redirect(url_for('home'))

@app.route('/project/<int:id>/pad/rename', methods=['GET'])
@login_required
def rename_pad(id):
    parent = request.args.get('parent', 1)
    filename = request.args.get('filename', 'new_file')
    new_filename = request.args.get('new', 'new_file')

    if int(parent) != 1:
        filename = tree_mappings[int(parent)] + "/" + filename
    else:
        filename = tree_mappings[int(parent)] + filename

    if int(parent) != 1:
        new_filename = tree_mappings[int(parent)] + "/" + new_filename
    else:
        new_filename = tree_mappings[int(parent)] + new_filename
    project = Project.query.get(id)

    if project is None:
        return redirect(url_for('home'))
    pads_filenames = [pad.filename for pad in project.pads]
    # Let the other clients know.
    for pad in project.pads:
        result = re.sub(r"" + filename + '\Z', new_filename, pad.filename)
        result = re.sub(r"" + filename + '/', new_filename + '/', result)
        if result not in pads_filenames:
            pad.filename = result
        # Let the other clients know.
        msg = {'projectId': id}
        msg['padId'], msg['filename'] = pad.id, pad.filename
        socketio_server.onFileManipulation('rename', msg)
    db.session.commit()
    return redirect(url_for('project', id=project.id))

@app.route('/project/<int:id>/pad/delete', methods=['GET'])
@login_required
def delete_pad(id):
    parent = request.args.get('parent', 1)
    filename = request.args.get('filename', 'new_file')

    if int(parent) != 1:
        filename = tree_mappings[int(parent)] + "/" + filename
    else:
        filename = tree_mappings[int(parent)] + filename

    project = Project.query.get(id)
    if project is None:
        return redirect(url_for('home'))

    pads_filenames = [pad.filename for pad in project.pads]
    for pad_name in pads_filenames:
        result = re.match(r"" + filename + '(/|\Z)', pad_name)
        if result:
            pad = project.pads.filter_by(filename=pad_name).first()
            # Let the other clients know.
            msg = {'projectId': id}
            msg['padId'] = pad.id
            socketio_server.onFileManipulation('delete', msg)
            # Remove from DB.
            db.session.delete(pad)
    db.session.commit()
    return redirect(url_for('project', id=project.id))

def construct_JSON(filenames, id):
    project = Project.query.get(id)
    id_count = 1
    root = {"id": id_count, "text": project.title}
    #Keeping the mappings
    id_count += 1
    if filenames:
        root['children'] = []
    for filename in filenames:
        paths = filename.split('/')
        current_path = "/"
        current_location = root
        for x in paths:
            if x:
                step = {"id": id_count, "text": x}
                current_path += x
                if len(current_path) != len(filename):
                    current_path += "/"
                else:
                    pad = project.pads.filter_by(filename=current_path).first()
                    if pad is None:
                        print(current_path + "--------")
                    if pad.is_file:
                        step["icon"] = "glyphicon glyphicon-file"
                        step['type'] = 'file'
                    else:
                        step['type'] = 'folder'
                tree_mappings[id_count] = current_path 
                id_count += 1
                exists = False
                if 'children' not in current_location:
                    current_location['children'] = []
                    current_location['children'].append(step)
                else:
                    for dicts in current_location['children']:
                        if dicts['text'] == x:
                            current_location = dicts
                            exists = True
                            break
                    if not exists:
                        current_location['children'].append(step)

                if x != paths[len(paths) - 1] and not exists:
                    current_location = current_location['children']
                    current_location = current_location[len(current_location) - 1]
    return [root]

@app.route('/project/<int:id>/filesJSON', methods=['GET'])
@login_required
def files_JSON(id):
    project = Project.query.get(id)
    pads_filenames = [pad.filename for pad in project.pads]
    result = construct_JSON(pads_filenames, id)
    return json.dumps(result)

@app.route('/project/<int:id>/getAllPads', methods=['GET'])
@login_required
def getAllPads(id):
    project = Project.query.get(id)
    allPads = []
    for pad in project.pads:
        crtPad = {}
        crtPad['id'] = pad.id
        crtPad['filename'] = pad.filename
        crtPad['text'] = pad.text
        crtPad['baseRev'] = pad.last_revision
        allPads.append(crtPad)
    return json.dumps(allPads)
