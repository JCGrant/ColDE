from flask import request
from flask_socketio import send, emit, join_room, leave_room
from app import socketio
from app.models import Pad, User, Revision
from threading import Lock

# Lock to ensure no more than one client update is processed at a time.
# TODO(mihai): check if this is fine.
update_lock = Lock()
# List of revisions for the current file. It should be empty each time the
# file is loaded from the database (revisions are not persistent).
revisions = []

@socketio.on('clientConnect')
def clientConnect(projectId):
    join_room(projectId)

@socketio.on('clientDisconnect')
def clientDisconnect(projectId):
    leave_room(projectId)

@socketio.on('client_server_changeset')
def handle(changeset):
    print ('Received ' + str(changeset))
    # Include the id of the client that generated the changeset.
    changeset['clientId'] = request.sid
    # TODO(mihai): update server state.
    with update_lock:
        # Fetch next revision number.
        next_revision = 1
        if revisions:
            next_revision = revisions[-1].id
        # Follow the changeset by all revisions not known by that user.
        for revision in revisions[changeset['baseRev'] :]:
            # changeset = follow(revision.changeset, changeset)
            pass
        # Create new revision out of this changeset.
        revisions.append(Revision(next_revision, changeset))
        # Broadcast to all clients.
        emit('server_client_changeset', changeset, broadcast=True)
    # Send ACK to the client.
    emit('server_client_ack', '', room=request.sid)

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
            crtCol = crtCol + 1;
        else:
            crtLine = crtLine + 1;
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

# def follow(this, otherCs):
#     assert this['baseLen'] == otherCs['baseLen']

#     print (str(this))
#     print (str(otherCs))
#     # Initialise the resulting cs.
#     resultCs = {}
#     resultCs['ops'] = []
#     resultCs['charBank'] = ''
#     resultCs['baseLen'] = this['newLen']

#     # Init needed pointers.
#     p1 = 0; p2 = 0; left = 0;
#     cbPointer1 = 0; cbPointer2 = 0;
#     endp1 = - 1; endp2 = - 1;
    # if (this.ops[0][0] != '+') {
    #     endp1 += this.ops[0][1];
    # }
    # if (otherCs.ops[0][0] != '+') {
    # endp2 += otherCs.ops[0][1];
    # }
    # // Add infinite length sentinels, to avoid some particular cases.
    # this.ops.push(['', infinity]);
    # otherCs.ops.push(['', infinity]);
    # // Perform the merge.
    # while (p1 < this.ops.length - 1 || p2 < otherCs.ops.length - 1) {
    # // Two pluses => keep insertions in A, add insertions from B.
    # // Priority has the lexicographically lower change.
    # if (this.ops[p1][0] === '+' && otherCs.ops[p2][0] === '+') {
    #   // Compare charbank substrings to be added here.
    #   cbss1 = this.charBank.substring(
    #     cbPointer1, cbPointer1 + this.ops[p1][1]);
    #   cbss2 = otherCs.charBank.substring(
    #     cbPointer2, cbPointer2 + otherCs.ops[p2][1]);
    #   // Prioritise the lower one.
    #   if (cbss1 <= cbss2) {
    #     resultCs.ops.push(['=', this.ops[p1][1]]);
    #     resultCs.ops.push(['+', otherCs.ops[p2][1]]);
    #   } else {
    #     resultCs.ops.push(['+', otherCs.ops[p2][1]]);
    #     resultCs.ops.push(['=', this.ops[p1][1]]);
    #   }
    #   // Update pointers.
    #   cbPointer1 += this.ops[p1][1];
    #   cbPointer2 += otherCs.ops[p2][1];
    #   ++p1; endp1 += this.ops[p1][1];
    #   ++p2; endp2 += otherCs.ops[p2][1];
    # } else if (this.ops[p1][0] === '+') {
    #   // Additions in A become retained chars.
    #   resultCs.ops.push(['=', this.ops[p1][1]]);
    #   cbPointer1 += this.ops[p1][1];
    #   // Update pointer.
    #   ++p1; endp1 += this.ops[p1][1];
    # } else if (otherCs.ops[p2][0] === '+') {
    #   // Additions in B become additions in B.
    #   resultCs.ops.push(otherCs.ops[p2]);
    #   cbPointer2 += otherCs.ops[p2][1];
    #   ++p2; endp2 += otherCs.ops[p2][1];
    # }
    # // Check whether afrer processing +'s we must stop.
    # if (p1 >= this.ops.length - 1 && p2 >= otherCs.ops.length - 1) {
    #   break;
    # }
    # // Compute the right of the current segment.
    # var right = Math.min(endp1, endp2);
    # if (this.ops[p1][0] === '=') {
    #   resultCs.ops.push([otherCs.ops[p2][0], right - left + 1]);
    # }
    # // Increment the pointers that no longer have elements.
    # if (endp1 === right) {
    #   ++p1;
    #   if (this.ops[p1][0] != '+') {
    #     endp1 += this.ops[p1][1];
    #   }
    # }
    # if (endp2 === right) {
    #   ++p2;
    #   if (otherCs.ops[p2][0] != '+') {
    #     endp2 += otherCs.ops[p2][1];
    #   }
    # }
    # left = right + 1;
    # }
    # // Remove infinite length elements.
    # this.ops.pop();
    # otherCs.ops.pop();

    # resultCs.charBank = otherCs.charBank;
    # // Compress the resulting changeset.
    # resultCs.compress();
    # // Compute the new len of the changeset.
    # resultCs.newLen = 0;
    # for (var i = 0; i < resultCs.ops.length; ++i) {
    # if (resultCs.ops[i][0] == '=' || resultCs.ops[i][0] == '+') {
    #   resultCs.newLen += resultCs.ops[i][1];
    # }
    # }
    # return resultCs;
