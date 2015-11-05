from app import socketio

@socketio.on('connect')
def connect():
    print('user connected!')
