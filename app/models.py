from werkzeug.security import generate_password_hash, check_password_hash

from app import db

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50))
    password_hash = db.Column(db.String(64))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.pw_hash, password)

class Pad(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(80))
    text = db.Column(db.Text)

    def __init__(self):
        self.text = '\n'
