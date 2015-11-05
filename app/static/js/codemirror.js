var editorArea = document.getElementById('editorArea')

var editor = CodeMirror.fromTextArea(editorArea, {
  lineNumbers: true,
  theme: 'monokai',
});

editor.setOption('extraKeys', {
  Tab: function(cm) {
    var spaces = '    ';
    cm.replaceSelection(spaces);
  }
});

editor.on('change', function(instance, changeset) {
    // Do not propagate the update if it was already from a different client.
    if (changeset.hasOwnProperty('origin') 
        && changeset['origin'] === 'external') {
        return;
    }
    onNewChangeset(changeset);
});

processExternalChangeset = function(changeset) {
    editor.replaceRange(changeset['text'], changeset['from'], 
        changeset['to'], 'external');
};
