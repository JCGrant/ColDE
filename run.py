#!/usr/bin/env python

from app import app, socketio

try:
	socketio.run(app)
except Exception as e:
	print (str(e))
