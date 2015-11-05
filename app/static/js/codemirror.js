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
