var editorAreas = document.getElementById('editorAreas');

/// Maps pad id to pad text area.
var padTextArea = {};
/// Maps pad id to pad editor.
var padEditor = {};
// Create code mirror instances for all pads.
// TODO(mihai): remove this dependency.
for (var i = 0; i < pads.length; ++i) {
  // Create holder text area.
  var textArea = document.createElement('textarea');
  editorAreas.appendChild(textArea);
  padTextArea[pads[i].id] = textArea;
  // Create the editor instance.
  var editor = CodeMirror.fromTextArea(textArea, {
    lineNumbers: true,
    mode: {name: "javascript", globalVars: true},
    keyMap: "sublime",
    autoCloseBrackets: true,
    matchBrackets: true,
    showCursorWhenSelecting: true,
    theme: 'monokai',
    foldGutter: true,
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
    tabSize: 2
  });
  textArea.nextSibling.style.display = 'none';
  // Configuration.
  editor.setOption('extraKeys', {
    Tab: function(cm) {
      var spaces = '    ';
      cm.replaceSelection(spaces);
    },
    "Ctrl-Space": "autocomplete"
  });
  // Run HTML function.
  editor.on('change', function runHTML() {
    var web = editor.getValue();
    var myPre = document.getElementById("webview");
    if (typeof(preprocess) == 'undefined') {
      return;
    }
    web = preprocess(web, 1);
    if (myPre != null) {
      myPre.src = "data:text/html;charset=utf-8," + escape(web);
    }
  });
  // Functions managing interaction with the socketio_client.
  blockedOrigins = ['external', 'setValue']
  editor.on('beforeChange', function(instance, changeset) {
    // Do not propagate the update if it was from a different client.
    if (changeset.hasOwnProperty('origin')
        && blockedOrigins.indexOf(changeset['origin']) >= 0) {
        return;
    }
    onBeforeChange(changeset);
  });
  // Set the content of the created pad.
  editor.setValue(pads[i].text);
  // Add the editor to the mapping.
  padEditor[pads[i].id] = editor;
}

// Display the initial pad.
var updateDisplayedPad = function(padId) {
  // Remove the instance already there, if it exists.
  if (displayedPad != -1) {
    padTextArea[displayedPad].nextSibling.style.display = 'none';
  }
  padTextArea[padId].nextSibling.offsetHeight;
  padTextArea[padId].nextSibling.style.display = 'block';
  padEditor[padId].refresh();
  // Focus editor.
  padEditor[padId].focus();
  displayedPad = padId;
}
// Display the first pad on project loading.
if (pads.length > 0) {
  updateDisplayedPad(pads[0].id);
}

function getCompletions(token, context) {
  var found = [], start = token.string;
  function maybeAdd(str) {
    if (str.indexOf(start) == 0) found.push(str);
  }
  function gatherCompletions(obj) {
    if (typeof obj == "string") forEach(stringProps, maybeAdd);
    else if (obj instanceof Array) forEach(arrayProps, maybeAdd);
    else if (obj instanceof Function) forEach(funcProps, maybeAdd);
    for (var name in obj) maybeAdd(name);
  }

  if (context) {
    // If this is a property, see if it belongs to some object we can
    // find in the current environment.
    var obj = context.pop(), base;
    if (obj.className == "js-variable")
      base = window[obj.string];
    else if (obj.className == "js-string")
      base = "";
    else if (obj.className == "js-atom")
      base = 1;
    while (base != null && context.length)
      base = base[context.pop().string];
    if (base != null) gatherCompletions(base);
  }
  else {
    // If not, just look in the window object and any local scope
    // (reading into JS mode internals to get at the local variables)
    for (var v = token.state.localVars; v; v = v.next) maybeAdd(v.name);
    gatherCompletions(window);
    forEach(keywords, maybeAdd);
  }
  return found;
};

// The bindings defined specifically in the Sublime Text mode
var bindings = {
  "Alt-Left": "goSubwordLeft",
  "Alt-Right": "goSubwordRight",
  "Ctrl-Up": "scrollLineUp",
  "Ctrl-Down": "scrollLineDown",
  "Shift-Ctrl-L": "splitSelectionByLine",
  "Shift-Tab": "indentLess",
  "Esc": "singleSelectionTop",
  "Ctrl-L": "selectLine",
  "Shift-Ctrl-K": "deleteLine",
  "Ctrl-Enter": "insertLineAfter",
  "Shift-Ctrl-Enter": "insertLineBefore",
  "Ctrl-D": "selectNextOccurrence",
  "Shift-Ctrl-Space": "selectScope",
  "Shift-Ctrl-M": "selectBetweenBrackets",
  "Ctrl-M": "goToBracket",
  "Shift-Ctrl-Up": "swapLineUp",
  "Shift-Ctrl-Down": "swapLineDown",
  "Ctrl-/": "function (cm) { \
    'use strict'; \
    cm.toggleComment({ indent: true }); \
  }",
  "Ctrl-J": "joinLines",
  "Shift-Ctrl-D": "duplicateLine",
  "Ctrl-T": "transposeChars",
  "F9": "sortLines",
  "Ctrl-F9": "sortLinesInsensitive",
  "F2": "nextBookmark",
  "Shift-F2": "prevBookmark",
  "Ctrl-F2": "toggleBookmark",
  "Shift-Ctrl-F2": "clearBookmarks",
  "Alt-F2": "selectBookmarks",
  "Alt-Q": "wrapLines",
  "Ctrl-K Ctrl-Backspace": "delLineLeft",
  "Backspace": "smartBackspace",
  "Ctrl-K Ctrl-K": "delLineRight",
  "Ctrl-K Ctrl-U": "upcaseAtCursor",
  "Ctrl-K Ctrl-L": "downcaseAtCursor",
  "Ctrl-K Ctrl-Space": "setSublimeMark",
  "Ctrl-K Ctrl-A": "selectToSublimeMark",
  "Ctrl-K Ctrl-W": "deleteToSublimeMark",
  "Ctrl-K Ctrl-X": "swapWithSublimeMark",
  "Ctrl-K Ctrl-Y": "sublimeYank",
  "Ctrl-K Ctrl-G": "clearBookmarks",
  "Ctrl-K Ctrl-C": "showInCenter",
  "Shift-Alt-Up": "selectLinesUpward",
  "Shift-Alt-Down": "selectLinesDownward",
  "Ctrl-F3": "findUnder",
  "Shift-Ctrl-F3": "findUnderPrevious",
  "Shift-Ctrl-[": "fold",
  "Shift-Ctrl-]": "unfold",
  "Ctrl-K Ctrl-j": "unfoldAll",
  "Ctrl-K Ctrl-0": "unfoldAll",
  "Ctrl-H": "replace"
};

// The implementation of joinLines
function joinLines(cm) {
  "use strict";

  var ranges = cm.listSelections(), joined = [];
  for (var i = 0; i < ranges.length; i++) {
    var range = ranges[i], from = range.from();
    var start = from.line, end = range.to().line;
    while (i < ranges.length - 1 && ranges[i + 1].from().line == end)
      end = ranges[++i].to().line;
    joined.push({start: start, end: end, anchor: !range.empty() && from});
  }
  cm.operation(function() {
    var offset = 0, ranges = [];
    for (var i = 0; i < joined.length; i++) {
      var obj = joined[i];
      var anchor = obj.anchor && Pos(obj.anchor.line - offset, obj.anchor.ch), head;
      for (var line = obj.start; line <= obj.end; line++) {
        var actual = line - offset;
        if (line == obj.end) head = Pos(actual, cm.getLine(actual).length + 1);
        if (actual < cm.lastLine()) {
          cm.replaceRange(" ", Pos(actual), Pos(actual + 1, /^\s*/.exec(cm.getLine(actual + 1))[0].length));
          ++offset;
        }
      }
      ranges.push({anchor: anchor || head, head: head});
    }
    cm.setSelections(ranges, 0);
  });
}

/**
 * Applies changeset to current editor content.
 */
processExternalChangeset = function(padId, changeset) {
  // Retrieve the editor instance.
  console.log(padId);
  var editor = padEditor[padId];
  var prevContent = editor.getValue("");
  console.assert(
    changeset.baseLen === prevContent.length, "cannot apply change");

  // Wrap everything in an atomic operation.
  editor.operation(function() {
    // Init content and char back pointers.
    var contentPointer = prevContent.length;
    var cbPointer = changeset.charBank.length;
    for (var i = changeset.ops.length - 1; i >= 0; --i) {
      var op = changeset.ops[i][0], c = changeset.ops[i][1];
      if (op === '+') {
        // Insert in the editor.
        editor.replaceRange(
          changeset.charBank.substring(cbPointer - c, cbPointer), 
          editor.posFromIndex(contentPointer), 
          editor.posFromIndex(contentPointer), 'external');
        cbPointer -= c;
      } else if (op === '-') {
        // Remove range.
        editor.replaceRange('', editor.posFromIndex(contentPointer - c), 
          editor.posFromIndex(contentPointer), 'external');
        contentPointer -= c;
      } else {
        // Leave chars unchanged.
        contentPointer -= c;
      }
    }
  });
};

setPadContent = function(padId, content) {
  // Retrieve the editor instance.
  var editor = padEditor[padId];
  editor.setValue(content);
};

getAbsoluteOffset = function(padId, position) {
  // Retrieve the editor instance.
  var editor = padEditor[padId];

  var offset = 0;
  for (var i = 0; i < position['line']; ++i) {
    offset = offset + editor.getLine(i).length + 1;
  }
  offset = offset + position['ch'];
  return offset;
};

getTextLength = function(padId) {
  // Retrieve the editor instance.
  var editor = padEditor[padId];
  return editor.getValue('').length;
};

getTextRange = function(padId, from, to) {
  // Retrieve the editor instance.
  var editor = padEditor[padId];
  return editor.getRange(from, to, '');
}
