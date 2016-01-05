from flask import Flask
from flask.ext.sqlalchemy import SQLAlchemy
from flask.ext.login import LoginManager
from flask_socketio import SocketIO

app = Flask(__name__)
app.config.from_object('app.config')
db = SQLAlchemy(app)

lm = LoginManager(app)
lm.login_view = 'login'

socketio = SocketIO(app)

from app import views, models, socketio_server
