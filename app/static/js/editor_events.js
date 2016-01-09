
/**
 * Called when the user changes the pad.
 */
$('.pad-button').click(function() {
  // Update displayed pad id.
  newDisplayedPad = $(this).data('id');
  // Update the editor content.
  updateDisplayedPad(newDisplayedPad);
});

/**
 * Creates a random ASCII string with a desired length.
 */
var randomString = function(length) {
  var text = '';
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < length; ++i) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

/// Mapping from comment code to the corresponding comment that have not been
/// submitted to server yet.
codeToComment = {};

/**
 * Called when an user has added a comment.
 */
var addComment = function() {
  // Fetch current editor.
  var editor = padEditor[displayedPad];
  // TODO(): prompt user for text.
  var text = 'blah blah very long texxxxtblah blah very long texxxxtblah blah very long texxxxtblah blah very long texxxxtblah blah very long texxxxtblah blah very long texxxxtblah blah very long texxxxtblah blah very long texxxxtblah blah very long texxxxtblah blah very long texxxxtblah blah very long texxxxtblah blah very long texxxxtblah blah very long texxxxtblah blah very long texxxxt';
  // Create the comment.
  var comment = {};
  // TODO(): get current username.
  comment['author'] = 'george';
  comment['text'] = text;
  var cursor = editor.getCursor();
  comment['line'] = cursor['line'];
  comment['ch'] = cursor['ch'];
  comment['padId'] = displayedPad;
  comment['projectId'] = projectId;
  // Create the corresponding changeset.
  var newCs;
  editor.operation(function() {
    var cursorMarker = editor.setBookmark(cursor);
    myMarkers.push([cursorMarker, false]);
    console.log('before2 ' + editor.getAllMarks().length);
    // Expand comments.
    expandEditorComments(displayedPad);
    // Create changeset object.
    newCs = new Changeset(getTextLength(displayedPad));
    newCs.newLen = newCs.baseLen + 20;
    var offset = getAbsoluteOffset(displayedPad, cursorMarker.find());
    // Generate code and send it to the next changeset.
    var code = '!<&' + randomString(14) + '&<!';
    if (!(displayedPad in codeToComment)) {
      codeToComment[displayedPad] = {};
    }
    // Add it to the two dictionaries.
    codeToComment[displayedPad][code] = comment;
    allComments[code] = comment;
    comment['code'] = code;
    // Fill newCs.
    newCs.charBank = code;
    newCs.ops = [];
    if (offset > 0) {
      newCs.ops.push(['=', offset]);
    }
    newCs.ops.push(['+', 20]);
    if (offset != newCs.baseLen) {
      newCs.ops.push(['=', newCs.baseLen - offset]);
    }
    // Remove cursor marker.
    removeMarker(cursorMarker);
    cursorMarker.clear();
    console.log('after2 ' + editor.getAllMarks().length);
    // Collapse comments.
    collapseEditorComments(displayedPad);
  });
  // Apply the changeset.
  var pad = padById[displayedPad];
  pad.csY = pad.csY.applyChangeset(newCs);
  // Display the comment in client, although not ACKed.
  displayComment(comment);
}

/// The 'add comment' button.
var addCommentButton = document.getElementById('clickAddComment');
/**
 * Called when the add comment button is clicked.
 */
addCommentButton.onclick = function() {
  addComment();
}
