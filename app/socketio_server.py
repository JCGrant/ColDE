from flask import request
from flask_socketio import send, emit
from app import socketio

class User:
    pass

users = {}

@socketio.on('connect')
def connect():
    users[request.sid] = User()

@socketio.on('disconnect')
def disconnect():
    del users[request.sid]

@socketio.on('incoming changset')
def handle(changeset):
    changeset['clientId'] = request.sid
    emit('incoming changeset', changeset, broadcast=True)
