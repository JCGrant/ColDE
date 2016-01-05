from flask import request, copy_current_request_context
from flask_socketio import send, emit, join_room, leave_room
from app import socketio, db
from app.models import Pad, User, Revision
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
    print ("serverDisonnect")
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
    # Include the id of the client that generated the changeset.
    changeset['clientId'] = request.sid
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
            revisions[project_id][pad_id] = [Revision(0, None)]
        next_revision = revisions[project_id][pad_id][-1].id + 1
        
        # Follow the changeset by all revisions not known by that user.
        revs = revisions[project_id][pad_id]
        apply_from = len(revs)
        for i in range(len(revs) - 1, 0, -1):
            if changeset['baseRev'] == revs[i].id:
                apply_from = i
                break
        for i in range(apply_from, len(revs)):
            changeset = follow(revs[i].changeset, changeset)

        # Create new revision out of this changeset.
        revisions[projectId][pad_id].append(Revision(next_revision, changeset))
        # Broadcast to all clients.
        emit('server_client_changeset', changeset, room=changeset['projectId'])
    # Send ACK to the client.
    emit('server_client_ack', changeset['padId'], room=request.sid)

@socketio.on('client_server_pads_retrieval')
def clientPadsHandler(pads):
    updateDBPads(pads)

# Updates the entries in the DB according to this info.
def updateDBPads(pads):
    projectPads = Pad.query.filter_by(project_id=pads['projectId']).all()
    for pad in projectPads:
        pad.text = pads[str(pad.id)]
        db.session.add(pad)
        print (pad.text)
    db.session.commit()

############### Changeset manipulation functions. #################

def combineLines(lines):
    # Combine an array of lines into a single string.
    s = ""
    for i, line in enumerate(lines):
        if (i != 0):
            s += '\n'
        s += line
    return s

def applyChangeset(pad, changeset):

    startPosition = -1
    crtLine = crtCol = 0
    toLine = changeset['from']['line']
    toCol = changeset['from']['ch']
    # Compute positions we have to insert text between.
    for i in range(len(pad.text)):
        if crtLine == toLine and crtCol == toCol:
            startPosition = i
            break
        if pad.text[i] != '\n':
            crtCol = crtCol + 1
        else:
            crtLine = crtLine + 1
            crtCol = 0
    if startPosition == -1:
        startPosition = len(pad.text)
    endPosition = startPosition + len(combineLines(changeset['removed'])) - 1
    listText = list(pad.text)
    print (listText)
    print (startPosition)
    print (endPosition)
    listText[startPosition : endPosition] = combineLines(changeset['text'])
    print (listText)
    pad.text = ''.join(listText)
    print (pad.text)

def follow(this, otherCs):
    assert this['baseLen'] == otherCs['baseLen']
    print (str(this))
    print (str(otherCs))
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
        if p1 >= len(this['ops']) - 1 and p2 >= len(otherCs['ops']) -1:
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
        if resultCs['ops'][i][0] == '=' and resultCs['ops'][i][0] == '+':
            resultCs['newLen'] += resultCs['ops'][i][1]
    return resultCs
    
def compress(this):
    # Initialise the resulting cs.
    resultCs = deepcopy(this)
    # Array of compressed ops.
    compressedOps = []
    for i in range(0, len(this['ops'])):
        # Compute maximal segment with the same operation.
        j, sum = i, 0
        while j < len(this['ops']) and this['ops'][j][0] == this['ops'][i][0]:
            sum += this['ops'][j][1]
            j += 1
        compressedOps.append([this['ops'][i][0], sum])
        i = j - 1

    if len(compressedOps) == 0:
        compressedOps = [['=', this.baseLen]]
    # Use the compressed ops, instead of the initial ones.
    resultCs['ops'] = compressedOps
