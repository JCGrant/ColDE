#!/usr/bin/env python

from app import app, socketio

socketio.run(app, host='0.0.0.0')
