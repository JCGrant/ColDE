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
    csX = new Changeset(length(padContent));
    csY = new Changeset(length(padContent));
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
var onNewChangeset = function(changeset) {
  // Merge changeset with csY.
  csY = mergeCodeMirrorChangeset(csY, changeset);
  // TODO: maybe send to server.
  // socket.emit('client_server_changeset', changeset);
};
