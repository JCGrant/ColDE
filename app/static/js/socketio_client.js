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

/// Content of the pad as a string, taking into account only revisions
/// received from the server or own ACKed revisions.
var padContent;
/// Submitted composition of changesets to server, still waiting for ACK.
var csX;
/// Unsubmitted local composition of changes.
var csY;

socket.on('message', function(data) {
  if (data['type'] === 'initial') {
    // Set current content of the pad.
    padContent = data['content'];
    setPadContent(padContent);
    // Initialise csX and csY to identity.
    csX = new Changeset(padContent.length);
    csY = new Changeset(padContent.length);
  }
});

socket.on('server_client_changeset', function(changeset) {
  // Skip the changeset if it was issued by us.
  if (changeset['clientId'] === userId) {
    return;
  }
  // Process update.
  processExternalChangeset(changeset);
});

/**
 * Called by CodeMirror when a new local changeset is available.
 * Updates the local unsubmitted changeset and maybe submits it to server.
 */
var onAfterChange = function(changeset) {
  // Convert CM changeset to our format.
  newCs = new Changeset(getTextLength()).fromCodeMirror(
      changeset, getAbsoluteOffset(changeset['from']));
  console.log('' + JSON.stringify(newCs));
  // Merge changeset with csY.
  csY = csY.applyChangeset(newCs);
  console.log(JSON.stringify(csY));
  // TODO: maybe send to server.
  socket.emit('client_server_changeset', changeset);
}

var sender;
if (typeof(sender) == 'undefined') {
  sender = new Worker('countdown.js');
}

tick = function() {
  // console.log('tick');
}
