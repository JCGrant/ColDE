from flask import request
from flask_socketio import send, emit
from app import socketio

class User:
    pass

class Pad:
    def __init__(self):
        self.content = "\n"


# Map from socket id to the User object.
users = {}
# Initial pad. TODO: handle multiple pads.
initPad = Pad();

@socketio.on('connect')
def connect():
    users[request.sid] = User()
    # Send the user the current content of the pad.
    send({'type' : 'initial', 'content' : initPad.content}, room=request.sid)

@socketio.on('disconnect')
def disconnect():
    del users[request.sid]

@socketio.on('incoming changset')
def handle(changeset):
    print ('Received ' + str(changeset))
    changeset['clientId'] = request.sid
    emit('incoming changeset', changeset, broadcast=True)
    # Update pad contents.
    applyChangeset(initPad, changeset)

def applyChangeset(pad, changeset):
    currentLines = changeset.splitlines()
    while len(currentLines) <= changeset['to'] - 2:
        currentLines.append('\n')