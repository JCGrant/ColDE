from app import app
from flask import render_template

@app.route('/')
def editor():
    return render_template('editor.html')
