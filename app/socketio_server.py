from flask import request
from flask_socketio import send, emit
from app import socketio
from app.models import Pad, User


# Map from socket id to the User object.
users = {}
# Initial pad. TODO: handle multiple pads.
initPad = Pad();

@socketio.on('connect')
def connect():
    users[request.sid] = User()
    # Send the user the current content of the pad.
    send({'type' : 'initial', 'content' : initPad.text}, room=request.sid)

@socketio.on('disconnect')
def disconnect():
    del users[request.sid]

@socketio.on('client_server_changeset')
def handle(changeset):
    print ('Received ' + str(changeset))
    changeset['clientId'] = request.sid
    # TODO(mihai): update server state.
    # emit('server_client_changeset', changeset, broadcast=True)
    emit('server_client_ack', '', room=request.sid)

def combineLines(lines):
    # Combine an array of lines into a single string.
    s = ""
    for i, line in enumerate(lines):
        if (i != 0):
            s += '\n'
        s += line
    return s

def applyChangeset(pad, changeset):

    startPosition = -1
    crtLine = crtCol = 0
    toLine = changeset['from']['line']
    toCol = changeset['from']['ch']
    # Compute positions we have to insert text between.
    for i in range(len(pad.text)):
        if crtLine == toLine and crtCol == toCol:
            startPosition = i
            break
        if pad.text[i] != '\n':
            crtCol = crtCol + 1;
        else:
            crtLine = crtLine + 1;
            crtCol = 0
    if startPosition == -1:
        startPosition = len(pad.text)
    endPosition = startPosition + len(combineLines(changeset['removed'])) - 1
    listText = list(pad.text)
    print (listText)
    print (startPosition)
    print (endPosition)
    listText[startPosition : endPosition] = combineLines(changeset['text'])
    print (listText)
    pad.text = ''.join(listText)
    print (pad.text)
