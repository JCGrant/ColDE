
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
 * Called when an user wants to add a comment.
 */
var addComment = function() {

  
}