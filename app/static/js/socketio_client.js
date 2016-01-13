// Socket object.
var socket = io();
// Current user id.
var userId;

socket.on('connect', function() {
  userId = socket.io.engine.id;
  // Announce server of client connect on projectId.
  socket.emit('clientConnect', projectId);
});

// Intercept window unload and check if there are unsubmitted changes.
$(window).on("beforeunload", function(e) {
  e = e || window.event;
  // Check if there are unsubmitted changes.
  unsubmitted = false;
  for (var i = 0; i < pads.length; ++i) {
    if (!pads[i].csX.isIdentity() || !pads[i].csY.isIdentity()) {
      unsubmitted = true;
      break;
    }
  }
  if (!unsubmitted) {
    return;
  }
  // String to be displayed.
  prompt = 'There are unsubmitted changes that may be lost!';
  if (e) {
    e.returnValue = prompt;
  }
  return prompt;
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
  // Copy the list of received comments to D.
  D['comments'] = cs['comments'];
  // Apply D changeset on current code mirror view even if the updated pad
  // is not the one we display.
  processExternalChangeset(cs['padId'], D);
  // Update base changeset.
  pad.baseRev = cs['revId'];
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
  // Fetch current editor.
  var displayedEditor = padEditor[displayedPad];
  var newCs;
  // Wrap everything in an atomic operation.
  displayedEditor.operation(function() {
    // Add bookmarks for easy position tracking.
    var fromMarker = displayedEditor.setBookmark(changeset['from']);
    var toMarker = displayedEditor.setBookmark(changeset['to']);
    myMarkers.push([fromMarker, false], [toMarker, false]);
    // Expand.
    expandEditorComments(displayedPad);
    // Update the CM changeset.
    changeset['removed'] 
      = [getTextRange(displayedPad, fromMarker.find(), toMarker.find())];
    newCs = new Changeset(getTextLength(displayedPad)).fromCodeMirror(
      changeset, getAbsoluteOffset(displayedPad, fromMarker.find()));
    // Remove auxiliary markers.
    console.log('before ' + displayedEditor.getAllMarks().length);
    removeMarker(fromMarker); fromMarker.clear();
    removeMarker(toMarker); toMarker.clear();
    console.log('after ' + displayedEditor.getAllMarks().length);
    // Collapse.
    collapseEditorComments(displayedPad);
  });
  // Merge changeset with csY.
  var pad = padById[displayedPad];
  console.log('csy is ' + JSON.stringify(pad.csY));
  console.log('newcs is ' + JSON.stringify(newCs));
  pad.csY = pad.csY.applyChangeset(newCs);
}

/**
 * Called when this client creates a new client.
 * Sends the comment to the server.
 */
var onCommentAdded = function(comment) {
  socket.emit('client_server_comment', comment);
}

/**
 * A comment is received from the server.
 */
socket.on('server_client_comment', function(comment) {
  if (comment['clientId'] === userId) {
    return;
  }
  displayComment(comment);
});

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
    console.log('not identity');
    console.log('cs x is ' + pads[i].csX);
    // Send.
    pads[i].csY['baseRev'] = pads[i].baseRev;
    pads[i].csY['padId'] = pads[i].id;
    pads[i].csY['projectId'] = projectId;
    console.log('cs y is ' + pads[i].csY);
    // Add possible comments.
    console.log('found: ');
    if (pads[i].id in codeToComment) {
      console.log('enters: ');
      pads[i].csY['comments'] = {};
      for (var code in codeToComment[pads[i].id]) {
        var comment = codeToComment[pads[i].id][code];
        pads[i].csY['comments'][code] = comment;
      }
      delete codeToComment[pads[i].id];
    }
    console.log('sends ' + JSON.stringify(pads[i].csY));
    // Assing this commit a revision id.
    pads[i].csY['revId'] = randomString(10);
    // Emit.
    socket.emit('client_server_changeset', pads[i].csY);
    pads[i].baseRev = pads[i].csY['revId'];
    console.log('a emis');
    // Compute pad len by adding comments len.
    var expanded = 0;
    var allMarks = padEditor[pads[i].id].getAllMarks();
    console.log(i);
    for (var j = 0; j < allMarks.length; ++j) {
      if (!isUnexpandable(allMarks[j])) {
        ++expanded;
      }
    }
    console.log(i);
    console.log('a emis2');
    var padActualLen = getTextLength(pads[i].id) + 20 * expanded;
    console.log('a emis3');
    // Update changesets.
    pads[i].csX = pads[i].csY;
    pads[i].csY = new Changeset(padActualLen);
    console.log('a emis4');
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

/**
 * Called every 500ms.
 */
tick = function() {
  // Maybe send existing changes to server.
  maybeSend();
  // Maybe refresh HTML display.
  runHTML();
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


// Recieve chat message
socket.on('chat message', function(msg) {
  $('#messages').append($('<li>').text(msg));
});

// Send chat message
var $chat_input = $('#chat input');
$('#chat').submit(function() {
  socket.emit('chat message', current_user + ": " + $chat_input.val());
  $chat_input.val('');
  return false;
});
