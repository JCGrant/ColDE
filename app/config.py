SECRET_KEY = 'super-secret!'
try:
    SQLALCHEMY_DATABASE_URI = dj_database_url.config(
except KeyError:
    SQLALCHEMY_DATABASE_URI = 'sqlite:///../test.db'

SQLALCHEMY_TRACK_MODIFICATIONS = True
DEBUG = True
