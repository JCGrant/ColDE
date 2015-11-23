// Socket object.
var socket = io();
// Current user id.
var userId;

socket.on('connect', function() {
  userId = socket.io.engine.id;
});

// Function to be called to process a changeset.
var processExternalChangeset;
// Function to be called to set the content of the pad.
var setPadContent;
// Function to compute the absolute offset in chars from the start of the file
// of a position in format (line, ch)
var getAbsoluteOffset;
// Function to return the current length of the code mirror document.
var getTextLength;
// Function to return a range in the current editor.
var getTextRange;

/// Initial content of the pad as a string.
var initPadContent;
/// Changeset containing only revisions received from the server
/// or own ACKed revisions.
var csA;
/// Submitted composition of changesets to server, still waiting for ACK.
var csX;
/// Unsubmitted local composition of changes.
var csY;
/// Length of text before the next changelist is applied.
var prevLen;

socket.on('message', function(data) {
  if (data['type'] === 'initial') {
    // Set current content of the pad.
    initPadContent = data['content'];
    setPadContent(initPadContent);
    // Initialise csA, csX and csY to identity.
    csA = new Changeset(initPadContent.length);
    csX = new Changeset(initPadContent.length);
    csY = new Changeset(initPadContent.length);
  }
});

socket.on('server_client_changeset', function(cs) {
  // Skip the changeset if it was issued by us.
  if (cs['clientId'] === userId) {
    return;
  }

  console.log('client received ' + JSON.stringify(cs));
  // Create changeset.
  var changeset = new Changeset(0);
  changeset.baseLen  = cs['baseLen'];
  changeset.newLen   = cs['newLen'];
  changeset.ops      = cs['ops'];
  changeset.charBank = cs['charBank'];

  var nextA = csA.applyChangeset(changeset);
  var nextX = changeset.mergeChangeset(csX);
  var nextY = csX.mergeChangeset(changeset).mergeChangeset(csY);
  var D     = csY.mergeChangeset(csX.mergeChangeset(changeset));
  // Update changesets.
  csA = nextA;
  csX = nextX;
  csY = nextY;
  // Apply D changeset on current code mirror view.
  processExternalChangeset(D);
});

// TODO(mihai): check how to use a socket.io callback for this.
socket.on('server_client_ack', function() {
  // TODO(mihai): update editor content.
  // Update changesets.
  csA = csA.applyChangeset(csX);
  csX = new Changeset(csA.newLen);
})

/**
 * Called by CodeMirror when a new local changeset is available.
 * Updates the local unsubmitted changeset and maybe submits it to server.
 */
var onAfterChange = function(changeset) {
  // Convert CM changeset to our format.
  // console.log('prevlen ' + prevLen);
  // newCs = new Changeset(prevLen).fromCodeMirror(
  //     changeset, getAbsoluteOffset(changeset['from']));
  // // Merge changeset with csY.
  // console.log('csY is ' + JSON.stringify(csY));
  // console.log('newCs is ' + JSON.stringify(newCs));
  // csY = csY.applyChangeset(newCs);
}

var sender;
if (typeof(sender) == 'undefined') {
  sender = new Worker('countdown.js');
}

/**
 * Called by CodeMirror before a new local changeset becomes available.
 * Updates the prev length of the text.
 */
var onBeforeChange = function(changeset) {
  prevLen = getTextLength();
  changeset['removed'] = [getTextRange(changeset['from'], changeset['to'])];
  newCs = new Changeset(prevLen).fromCodeMirror(
      changeset, getAbsoluteOffset(changeset['from']));
  // Merge changeset with csY.
  console.log('initial cs ' + JSON.stringify(changeset));
  console.log('csY is ' + JSON.stringify(csY));
  console.log('newCs is ' + JSON.stringify(newCs));
  csY = csY.applyChangeset(newCs);
  console.log('csY becomes ' + JSON.stringify(csY));
}

var sender;
if (typeof(sender) == 'undefined') {
  sender = new Worker('countdown.js');
}

/**
 * Timestamp for the last moment when local changes were submitted to server.
 */
var lastSent = 0;
/**
 * Decides whether to send the local changes to server or not.
 * Also does the sending of local changes if it is the case.
 */
var maybeSend = function() {
  var t = new Date().getTime();
  // 500ms have to pass since last sent, we mush have received ACK for the
  // last submitted changelist, and local changes have to exist.
  if (t - lastSent < 500 || !csX.isIdentity() || csY.isIdentity()) {
    return;
  }
  
  // Send.
  socket.emit('client_server_changeset', csY);
  // Update changesets.
  csX = csY;
  csY = new Changeset(getTextLength());

  lastSent = t;
}

/**
 * Called every 500ms.
 */
tick = function() {
  maybeSend();
}
