
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
 * Adds the bookmark in codemirror.
 */
var displayComment = function(comment) {
  // TODO(): display comment properly.
  var element = document.createElement('BUTTON');

  var position = {
    'line': comment['line'],
    'ch': comment['ch']
  }
  padEditor[comment['padId']].setBookmark(position, {'widget' : element});
}

/**
 * Called when an user wants to add a comment.
 */
var addComment = function() {

  // TODO(): prompt user for text.
  var text = 'blah blah';
  // Create comment.
  var comment = {};
  // TODO(): get current username.
  comment['author'] = 'george';
  comment['text'] = text;
  var cursor = padEditor[displayedPad].getCursor();
  comment['line'] = cursor['line'];
  comment['ch'] = cursor['ch'];
  comment['padId'] = displayedPad;
  comment['projectId'] = projectId;
  // Notice the server.
  onCommentAdded(comment);
  // Display the comment in client, although not ACKed.
  displayComment(comment);
}
