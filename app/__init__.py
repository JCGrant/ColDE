from flask import Flask
from flask.ext.sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from app import config

app = Flask(__name__)
app.config.from_object(config)
db = SQLAlchemy(app)
socketio = SocketIO(app)

from app import views, models, socketio_server
