import os
SECRET_KEY = 'super-secret!'

if os.environ.get('DOKKU'):
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
else:
    SQLALCHEMY_DATABASE_URI = 'sqlite:///../test.db'

SQLALCHEMY_TRACK_MODIFICATIONS = True
DEBUG = True
