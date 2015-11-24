from werkzeug.security import generate_password_hash, check_password_hash

from app import db

user_classroom = db.Table('user_classroom',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id')),
    db.Column('classroom_id', db.Integer, db.ForeignKey('classroom.id')),
)

user_project = db.Table('user_project',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id')),
    db.Column('project_id', db.Integer, db.ForeignKey('project.id')),
)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50))
    password_hash = db.Column(db.String(64))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.pw_hash, password)

    def __str__(self):
        return self.username


class Classroom(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120))
    projects = db.relationship('Project', backref='user', lazy='dynamic')

    def __str__(self):
        return self.title


class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    def __str__(self):
        return self.title



class Pad(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(80))
    text = db.Column(db.Text)
    language = db.Column(db.String(20))

    def __str__(self):
        return self.title
