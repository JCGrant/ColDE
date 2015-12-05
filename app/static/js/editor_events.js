$('.pad-button').click(function() {
  var padId = $(this).data('id');
  var pad = getPad(padId);
  editor.setValue(pad.text);
});
