
// Socket object.
var socket = io();
// Current user id.
var userId;
// Set of changesets sent by this user.

socket.on('connect', function() {
  userId = socket.io.engine.id;
});

// Function to be called to process a changeset.
var processExternalChangeset;
// Function to be called to set the content of the pad.
var setPadContent;

socket.on('message', function(data) {
	if (data['type'] === 'initial') {
		// Set current content of the pad.
		setPadContent(data['content']);
	}
});

socket.on('incoming changeset', function(changeset) {
  // Skip the changeset if it was issued by us.
  if (changeset['clientId'] === userId) {
    return;
  }
  // Process update.
  processExternalChangeset(changeset);
});

var onNewChangeset = function(changeset) {
  socket.emit('incoming changset', changeset);
};
