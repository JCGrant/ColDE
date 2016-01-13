from flask import request, copy_current_request_context
from flask_socketio import send, emit, join_room, leave_room
from app import socketio, db
from app.models import Pad, User, Revision, Comment
from threading import Lock
from math import inf as infinity
from copy import deepcopy

# Lock to ensure no more than one client update is processed at a time.
# TODO(mihai): check if this is fine.
update_locks = {}
# List of revisions for the current file. It should be empty each time the
# file is loaded from the database (revisions are not persistent).
revisions = {}
# List of users connected to each project.
project_users = {}

@socketio.on('clientConnect')
def clientConnect(projectId):
    # Add current user to his project.
    if projectId in project_users:
        project_users[projectId].append(request.sid)
    else:
        project_users[projectId] = [request.sid]
    join_room(projectId)

@socketio.on('clientDisconnect')
def clientDisconnect(pads):
    projectId = pads['projectId']
    # Remove user from dictionary and room.
    project_users[projectId].remove(request.sid)
    if not project_users[projectId]:
        del project_users[projectId]
    leave_room(projectId)
    # Write state in db.
    updateDBPads(pads)

@socketio.on('client_server_changeset')
def handle(changeset):
    print ('Received ' + str(changeset))
    # Fetch project and pad ids.
    project_id = changeset['projectId']
    pad_id = changeset['padId']
    # Fetch project lock or create it, if not exists already.
    if project_id not in update_locks:
        update_locks[project_id] = Lock()
    update_lock = update_locks[project_id]
    # TODO(mihai): update server state.
    with update_lock:
        # Fetch next revision number.
        if project_id not in revisions:
            revisions[project_id] = {}
        if pad_id not in revisions[project_id]:
            revisions[project_id][pad_id] = [Revision('0', None)]
        
        # Follow the changeset by all revisions not known by that user.
        revs = revisions[project_id][pad_id]
        apply_from = len(revs)
        for i in range(len(revs), 0, -1):
            if changeset['baseRev'] == revs[i - 1].id:
                apply_from = i
                break
        for i in range(apply_from, len(revs)):
            if changeset['baseLen'] == revs[i].changeset['newLen']:
                apply_from = i
        # Fetch current revision.
        crtRev, baseRev = changeset['revId'], changeset['baseRev']
        if apply_from != len(revs):
            print ('current cs is ' + str(changeset))
            print (str(revisions[project_id][pad_id][(apply_from-1):len(revs)]))
        for i in range(apply_from, len(revs)):
            print ('applied follow')
            changeset = follow(revs[i].changeset, changeset)
        # Update base rev.
        changeset['baseRev'] = baseRev
        # Create new revision out of this changeset.
        revisions[project_id][pad_id].append(Revision(crtRev, changeset))
        print ('important revs: ' + str(revisions[project_id][pad_id][apply_from : ]))
        # Update current pad in db.
        changeset['projectId'], changeset['padId'] = project_id, pad_id
        changeset['revId'] = crtRev
        updateDBPad(changeset, crtRev)
        # Add the new comments to DB.
        if 'comments' in changeset:
            for code, comment in changeset['comments'].items():
                newComment = Comment(comment['author'], comment['text'])
                newComment.pad_id = comment['padId']
                newComment.code = comment['code']
                db.session.add(newComment)
            db.session.commit()
        # Include the id of the client that generated the changeset.
        changeset['clientId'] = request.sid
        # Broadcast to all clients.
        emit('server_client_changeset', changeset, room=changeset['projectId'])
        print ('------------------------------------------------')
    # Send ACK to the client.
    emit('server_client_ack', changeset['padId'], room=request.sid)

@socketio.on('client_server_comment')
def onNewComment(comment):
    # Stamp with the client id & send.
    comment['clientId'] = request.sid
    emit('server_client_comment', comment, room=comment['projectId'])

@socketio.on('chat message')
def chatMessage(message):
    emit('chat message', message, broadcast=True)

# Updates the entries in the DB according to this info.
def updateDBPad(changeset, crtRev):
    pad = Pad.query.filter_by(project_id=changeset['projectId']).\
        filter_by(id=changeset['padId']).first()
    if not pad:
        return
    # Update pad text content.
    pad.text = applyChangeset(pad.text, changeset)
    # Update code of last revision.
    pad.last_revision = crtRev
    # Write to DB.
    db.session.add(pad)
    db.session.commit()

############### Changeset manipulation functions. #################

def applyChangeset(text, changeset):
    assert len(text) == changeset['baseLen']
    
    # Init resulting text and pointers.
    resultText = ''
    textPointer, cbPointer = 0, 0
    # Apply operations.
    for i in range(0, len(changeset['ops'])):
        op, c = changeset['ops'][i][0], changeset['ops'][i][1]
        if op == '+':
            # Get from char bank.
            resultText += changeset['charBank'][cbPointer : (cbPointer + c)]
            cbPointer += c
        elif op == '-':
            # Skip chars from the initial text.
            textPointer += c
        elif op == '=':
            # Keep chars from the initial text.
            resultText += text[textPointer : (textPointer + c)]
            textPointer += c

    return resultText

def follow(this, otherCs):
    assert this['baseLen'] == otherCs['baseLen']
    # Initialise the resulting cs.
    resultCs = {}
    resultCs['ops'] = []
    resultCs['charBank'] = ''
    resultCs['baseLen'] = this['newLen']
    # Init needed pointers.
    p1, p2, left = 0, 0, 0
    cbPointer1, cbPointer2 = 0, 0
    endp1, endp2 = -1, -1
    if this['ops'][0][0] != '+':
        endp1 += this['ops'][0][1]
    if otherCs['ops'][0][0] != '+':
        endp2 += otherCs['ops'][0][1]
    # Add infinite length sentinels, to avoid some particular cases.
    this['ops'].append(['', infinity])
    otherCs['ops'].append(['', infinity])
    # Perform the merge.
    while p1 < len(this['ops']) - 1 or p2 < len(otherCs['ops']) - 1: 
        # Two pluses => keep insertions in A, add insertions from B.
        # Priority has the lexicographically lower change.
        if this['ops'][p1][0] == '+' and otherCs['ops'][p2][0] == '+': 
            # Compare charbank substrings to be added here.
            cbss1 = this['charBank'][cbPointer1 : (cbPointer1 + this['ops'][p1][1])]
            cbss2 = otherCs['charBank'][cbPointer2 : (cbPointer2 + otherCs['ops'][p2][1])]
            # Prioritise the lower one.
            if cbss1 <= cbss2:
               resultCs['ops'].append(['=', this['ops'][p1][1]])
               resultCs['ops'].append(['+', otherCs['ops'][p2][1]])
            else:
               resultCs['ops'].append(['+', otherCs['ops'][p2][1]])
               resultCs['ops'].append(['=', this['ops'][p1][1]])
            #  Update pointers.
            cbPointer1 += this['ops'][p1][1]
            cbPointer2 += otherCs['ops'][p2][1]
            p1 += 1
            endp1 += this['ops'][p1][1]
            p2 += 1
            endp2 += otherCs['ops'][p2][1]
        elif this['ops'][p1][0] == '+':
            # Additions in A become retained chars.
            resultCs['ops'].append(['=', this['ops'][p1][1]])
            cbPointer1 += this['ops'][p1][1]
            # Update pointer.
            p1 += 1
            endp1 += this['ops'][p1][1]
        elif otherCs['ops'][p2][0] == '+':
            # Additions in B become additions in B.
            resultCs['ops'].append(otherCs['ops'][p2])
            cbPointer2 += otherCs['ops'][p2][1]
            p2 += 1
            endp2 += otherCs['ops'][p2][1]
        # Check whether afrer processing +'s we must stop.
        if p1 >= len(this['ops']) - 1 and p2 >= len(otherCs['ops']) - 1:
            break
        # Compute the right of the current segment.
        right = min(endp1, endp2)
        if  this['ops'][p1][0] == '=':
            resultCs['ops'].append([otherCs['ops'][p2][0], right - left + 1])
        # Increment the pointers that no longer have elements.
        if endp1 == right: 
            p1 += 1
            if this['ops'][p1][0] != '+':
                endp1 += this['ops'][p1][1]
        if endp2 == right:
            p2 += 1
            if otherCs['ops'][p2][0] != '+':
                endp2 += otherCs['ops'][p2][1]
        left = right + 1
    # Remove infinite length elements.
    this['ops'].pop()
    otherCs['ops'].pop()

    resultCs['charBank'] = otherCs['charBank']
    # Compress the resulting changeset.
    resultCs = compress(resultCs)
    # Compute the new len of the changeset.
    resultCs['newLen'] = 0
    for i in range(0, len(resultCs['ops'])):
        if resultCs['ops'][i][0] == '=' or resultCs['ops'][i][0] == '+':
            resultCs['newLen'] += resultCs['ops'][i][1]
    print ('follow on ' + str(this) + ' --- AND --- ' + str(otherCs) + ' RETURNS ' + str(resultCs))
    return resultCs
    
def compress(this):
    print ('compress called on ' + str(this))
    # Initialise the resulting cs.
    resultCs = deepcopy(this)
    print ('deep copied ' + str(resultCs))
    # Array of compressed ops.
    compressedOps = []
    i = 0
    while i < len(this['ops']):
        # Compute maximal segment with the same operation.
        j, sum = i, 0
        while j < len(this['ops']) and this['ops'][j][0] == this['ops'][i][0]:
            sum += this['ops'][j][1]
            j += 1
        compressedOps.append([this['ops'][i][0], sum])
        i = j

    if len(compressedOps) == 0:
        compressedOps = [['=', this.baseLen]]
    # Use the compressed ops, instead of the initial ones.
    resultCs['ops'] = compressedOps
    return resultCs
