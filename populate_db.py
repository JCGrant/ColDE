#!/usr/bin/env python3

from app import db
from app.models import User, Project, Pad

# user <= (username, password, [project_ids])
users = [
    ('test', 'test', [1, 2]),
    ('test2', 'test2', [1]),
]
# project <= title
projects = [
    'Web App',
    'Python project',
]
# pad <= (filename, project_id, text)
pads = [
    ('/index.html', 1,
"""<html>
  <head>
    <title>Test Site</title>
    <link rel='stylesheet' href='style.css'>
  </head>
  <body>
    <h1>Test Site</h1>
    <p>Hey there!</p>
    <script src='script.js'></script>
  </body>
</html>"""),

    ('/script.js', 1,
"""var x = 2;
var y = 3;
console.log(x + y);"""),

    ('/style.css', 1,
"""body {
  background: red;
}"""),

    ('/app.py', 2,
"""import helpers
def fibs(n):
    for i in range(n):
        print(helpers.fib(i))

fibs(10)"""),

    ('/helpers.py', 2,
"""def fib(n):
    a, b = 1, 1
    for i in range(n):
        a, b = b, a + b
    return a"""),

    ('/turtle_test.py', 2,
"""import turtle

t = turtle.Turtle()

for c in ['red', 'green', 'yellow', 'blue']:
    t.color(c)
    t.forward(75)
    t.left(90)"""),
]

for title in projects:
    pr = Project(title)
    db.session.add(pr)

for username, password, project_ids in users:
    user = User(username, password)
    for pid in project_ids:
        pr = Project.query.get(pid)
        user.projects.append(pr)
    db.session.add(user)
    pr.users.append(user)

for filename, project_id, text in pads:
    pad = Pad(filename, project_id)
    pad.text = text
    db.session.add(pad)

db.session.commit()
