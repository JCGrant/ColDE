// Socket object.
var socket = io();
// Current user id.
var userId;

socket.on('connect', function() {
  userId = socket.io.engine.id;
  // Announce server of client connect on projectId.
  socket.emit('clientConnect', projectId);
});

$(window).on("beforeunload", function() {
  // Announce server of disconnection, and include current pads state.
  socket.emit('clientDisconnect', getAllPads());
})

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
/// Length of text before the next changelist is applied.
var prevLen;
/// Mapping from pad id to pad object.
var padById = {};
/// Id of pad that is currently displayed.
var displayedPad = -1;

// Init pad list.
for (var i = 0; i < pads.length; ++i) {
  // Initialise csA, csX and csY to identity.
  // Changeset containing only revisions received from the server
  // or own ACKed revisions.
  pads[i].csA = new Changeset(pads[i].text.length);
  // Submitted composition of changesets to server, still waiting for ACK.
  pads[i].csX = new Changeset(pads[i].text.length);
  // Unsubmitted local composition of changes.
  pads[i].csY = new Changeset(pads[i].text.length);
  // The last revision received from server.
  pads[i].baseRev = 0;
  // Add the current pad in the mapping by id.
  padById[pads[i].id] = pads[i];
}

socket.on('server_client_changeset', function(cs) {
  // Skip the changeset if it was issued by us.
  if (cs['clientId'] === userId) {
    return;
  }

  // Create changeset.
  var changeset = new Changeset(0);
  changeset.baseLen  = cs['baseLen'];
  changeset.newLen   = cs['newLen'];
  changeset.ops      = cs['ops'];
  changeset.charBank = cs['charBank'];

  // Get pad from its id.
  var pad = padById[cs['padId']];

  var nextA = pad.csA.applyChangeset(changeset);
  var nextX = changeset.mergeChangeset(pad.csX);
  var nextY = pad.csX.mergeChangeset(changeset).mergeChangeset(pad.csY);
  var D     = pad.csY.mergeChangeset(pad.csX.mergeChangeset(changeset));
  // Update changesets.
  pad.csA = nextA;
  pad.csX = nextX;
  pad.csY = nextY;
  // Apply D changeset on current code mirror view even if the updated pad
  // is not the one we display.
  processExternalChangeset(cs['padId'], D);
  // Update base changeset.
  pad.baseRev = cs['baseRev'];
});

// TODO(mihai): check how to use a socket.io callback for this.
socket.on('server_client_ack', function(padId) {
  // TODO(mihai): update editor content.
  // Update changesets.
  var pad = padById[padId];
  pad.csA = pad.csA.applyChangeset(pad.csX);
  pad.csX = new Changeset(pad.csA.newLen);
});

/**
 * Called by CodeMirror when a new local changeset is available.
 * Updates the local unsubmitted changeset and maybe submits it to server.
 */
var onAfterChange = function(changeset) {

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
  prevLen = getTextLength(displayedPad);
  changeset['removed'] 
    = [getTextRange(displayedPad, changeset['from'], changeset['to'])];
  newCs = new Changeset(prevLen).fromCodeMirror(
      changeset, getAbsoluteOffset(displayedPad, changeset['from']));
  // Merge changeset with csY.
  var pad = padById[displayedPad];
  pad.csY = pad.csY.applyChangeset(newCs);
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
  // 500ms have to pass since last sent.
  if (t - lastSent < 500) {
    return;
  }

  for (var i = 0; i < pads.length; ++i) {
    // We mush have received ACK for the last submitted changelist,
    // and local changes have to exist.
    if (!pads[i].csX.isIdentity() || pads[i].csY.isIdentity()) {
      continue;
    }
    // Send.
    pads[i].csY['baseRev'] = pads[i].baseRev;
    pads[i].csY['padId'] = pads[i].id;
    pads[i].csY['projectId'] = projectId;
    socket.emit('client_server_changeset', pads[i].csY);
    // Update changesets.
    pads[i].csX = pads[i].csY;
    pads[i].csY = new Changeset(getTextLength(pads[i].id));
  }

  lastSent = t;
}

/**
 * Create the 500ms ticker.
 */
var sender;
if (typeof(sender) == 'undefined') {
  sender = new Worker('countdown.js');
}

// Number of intervals, when we have to send the server full pads.
var FULL_SEND_INTERVAL = 10;
var untilFullSend = FULL_SEND_INTERVAL;

/**
 * Called every 500ms.
 */
tick = function() {
  maybeSend();
  // Decrease untilFullSend and send if necessary.
  // TODO(mihai): this code should not be here.
  --untilFullSend;
  if (untilFullSend == 0) {
    untilFullSend = FULL_SEND_INTERVAL;
    socket.emit('client_server_pads_retrieval', getAllPads());
  }
}

/**
 * Builds a dictionary containing the contents of all pads existing in client.
 */
var getAllPads = function() {
  var allPads = {};
  for (padId in padEditor) {
    allPads[padId] = padEditor[padId].getValue("");
  }
  allPads['projectId'] = projectId
  return allPads;
}
