from werkzeug.security import generate_password_hash, check_password_hash

from app import db

#user_classroom = db.Table('user_classroom',
#    db.Column('user_id', db.Integer, db.ForeignKey('user.id')),
#    db.Column('classroom_id', db.Integer, db.ForeignKey('classroom.id')),
#)

users = db.Table('users',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id')),
    db.Column('project_id', db.Integer, db.ForeignKey('project.id')),
)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50))
    password_hash = db.Column(db.String(100))
    most_recent_project_id = db.Column(db.Integer)

    def __init__(self, username, password):
        self.username = username
        self.set_password(password)

    @property
    def is_authenticated(self):
        return True

    @property
    def is_active(self):
        return True

    @property
    def is_anonymous(self):
        return False

    def get_id(self):
        return str(self.id)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return self.username

class Classroom(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120))

    def __repr__(self):
        return self.title

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(80))
    users = db.relationship('User', secondary=users,
            backref=db.backref('projects', lazy='dynamic'))
    pads = db.relationship('Pad', backref='project', lazy='dynamic')

    def __init__(self, title):
        self.title = title

    def __repr__(self):
        return self.title

class Pad(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(80))
    text = db.Column(db.Text)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'))
    comments = db.relationship('Comment', backref='pad', lazy='dynamic')
    last_revision = db.Column(db.String(10))
    is_file = db.Column(db.Boolean)

    def __init__(self, filename, project_id):
        self.filename = filename
        self.is_file = False
        self.text = ''
        self.project_id = project_id
        self.last_revision = '0'

    def __repr__(self):
        return self.filename

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    pad_id = db.Column(db.Integer, db.ForeignKey('pad.id'))
    author = db.Column(db.String(50))
    text = db.Column(db.Text)
    code = db.Column(db.String(20))

    def __init__(self, author, text):
        self.author = author
        self.text = text
        self.pos_line, self.pos_ch = 0, 0

    def __repr__(self):
        return self.text

# Class to represent a user revision.
# TODO(mihai): maybe put it in a separate file. Not really a model (yet).
class Revision:
    def __init__(self, id, changeset):
        self.id = id
        self.changeset = changeset
    def __repr__(self):
        # return '' + str(self.id) + ' ' + str(self.changeset)
        return 'id: ' + str(self.id) + '---' + ' baseLen ' + str(self.changeset['baseLen']) + ' newLen ' + str(self.changeset['newLen']) + ' baseRev ' + str(self.changeset['baseRev'])
