#!/usr/bin/env python

from app import app, socketio

socketio.run(app, debug=True, host='0.0.0.0', port=54322)
