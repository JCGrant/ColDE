
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

socket.on('incoming changeset', function(changeset) {
    // Skip the changeset if it was issued by us.
    if (changeset['clientId'] === userId) {
        return;
    }
    console.log('PROCESSING' + changeset);
    // Process update.
    processExternalChangeset(changeset);
});

var onNewChangeset = function(changeset) {
    socket.emit('incoming changset', changeset);
};
