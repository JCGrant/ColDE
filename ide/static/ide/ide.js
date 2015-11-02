var editor = CodeMirror.fromTextArea(document.getElementById("code"), {
    mode: {
        name: "python",
        version: 3,
        singleLineStringErrors: false,
    },
    lineNumbers: true,
    indentUnit: 4,
    matchBrackets: true
});
