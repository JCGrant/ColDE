#!/usr/bin/env python

from app import app, socketio

try:
	socketio.run(app, host='0.0.0.0')
except Exception as e:
	print (str(e))
