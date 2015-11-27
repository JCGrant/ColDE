import os
SECRET_KEY = 'super-secret!'

try:
    SQLALCHEMY_DATABASE_URI = os.environ['DATABASE_URL']
except KeyError:
    SQLALCHEMY_DATABASE_URI = 'sqlite:///../test.db'

SQLALCHEMY_TRACK_MODIFICATIONS = True
DEBUG = True
