$("#runButton").click(runChooseButton);
function runChooseButton() {
  var split = getCurrentPad().split(".");
  var ext = "";
  
  if(split[1]) {
    ext = split[1];
  }
  switch(ext) {
    case "js":
      runJScode()
      break;
    case "py":
      runit()
      break;
    case "html":
      language = "htmlmixed"
      break;
  }
}
function createEditor(filename, textArea) {
  var language = ""
  var split = filename.split(".");
  var ext = "";
  
  if(split[1]) {
    ext = split[1];
  }
  var tabSize = 2
  switch(ext) {
    case "js":
      language = "javascript"
      break;
    case "py":
      language = "python"
      tabSize = 4
      break;
    case "html":
      language = "htmlmixed"
      break;
    case "css":
      language = "css"
      break;
  }

  var editor = CodeMirror.fromTextArea(textArea, {
    lineNumbers: true,
    mode: {name: language, globalVars: true},
    keyMap: "sublime",
    autoCloseBrackets: true,
    matchBrackets: true,
    showCursorWhenSelecting: true,
    theme: 'monokai',
    foldGutter: true,
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
    tabSize: tabSize,
  });

  return editor;
}

/**
 * Refresh HTML visualised if currently displayed pad is HTML, and it has been
 * modified.
 */
var runHTML = function() {
  var split = getCurrentPad().split(".");
  var ext = "";
  if (split[1]) {
    ext = split[1];
  }

  if (ext == "html" && notClean) {
    // Run HTML function.
    var web = padEditor[displayedPad].getValue();
    var myPre = document.getElementById("webview");
    if (typeof(preprocess) == 'undefined') {
      return;
    }
    web = preprocess(web, 1);
    if (myPre != null && web != null) {
      myPre.src = "data:text/html;charset=utf-8," + escape(web);
    }
    notClean = false;
  } 
}

var editorAreas = document.getElementById('editorAreas');

/// Dictionary to say whether a comment marker is ours or not, and whether
/// it is expandable or not.
var myMarkers = [];
var removeMarker = function(marker) {
  var index = -1;
  for (var i = 0; i < myMarkers.length; ++i) {
    if (myMarkers[i][0] == marker) {
      index = i;
      break;
    }
  }
  if (index > -1) {
    myMarkers.splice(index, 1);
  }
}
var isUnexpandable = function(marker) {
  var index = -1;
  for (var i = 0; i < myMarkers.length; ++i) {
    if (myMarkers[i][0] == marker) {
      return !myMarkers[i][1];
    }
  }
  return true;
}

// Id counter for comments.
var commentId = 0;
/**
 * Adds the bookmark in codemirror.
 */
var displayComment = function(comment) {
  // Create comment element, to be added in the bookmark.
  var element = document.createElement('a');
  element.setAttribute('tabindex', '0');
  element.setAttribute('class', 'btn btn-lg btn-danger');
  element.setAttribute('role', 'button');
  element.style.padding = '0px 0px';
  element.style.width = '5px';
  element.style.height = '11px';
  element.setAttribute('data-toggle', 'popover');
  // element.setAttribute('data-trigger', 'focus');
  // TODO(mihai): set placement according to width / height.
  element.setAttribute('data-placement', 'top');
  element.setAttribute('data-content', comment['text']);
  element.id = 'comment' + commentId;
  // Save current comment id.
  var usedId = commentId;
  // Increase comment id counter.
  ++commentId;

  var position = {
    'line': comment['line'],
    'ch': comment['ch']
  }
  var marker = padEditor[comment['padId']].setBookmark(position, 
    {'widget' : element, 'handleMouseEvents' : true});
  myMarkers.push([marker, true]);
  // Enable bootstrap popover.
  $(document).ready(function() {
    $('[data-toggle="popover"]').popover({container:'body', animation:false});
  });
  // Return current comment id.
  return '#comment'+usedId;
}

/**
 * Detect comments added by a new changeset, and display them in the client.
 */
var detectComments = function(editor) {
  // List of comment ids generated in this call.
  var ids = [];
  // Content & content pointer.
  var content = editor.getValue('');
  var p = content.length;
  while (true) {
    // Search for the next possible beginning.
    p = content.lastIndexOf('&<!', p);
    if (p == -1) {
      break;
    }
    // Check if valid comment.
    var commentCode = content.substring(p - 17, p + 3);
    if (commentCode.length === 20 && commentCode.substring(0, 3) === '!<&') {
      // Found valid comment so null that range.
      var start = editor.posFromIndex(p - 17);
      var end = editor.posFromIndex(p + 3);
      editor.replaceRange('', start, end, 'aux');
      // Display the comment.
      var comment = allComments[commentCode];
      comment['line'] = start['line'];
      comment['ch'] = start['ch'];
      // Push the id in the resulting ids list.
      ids.push(displayComment(comment));
      // Update pointer to skip the found range.
      p -= 18;
    } else {
      // Increment p to avoid cycling.
      --p;
    }
  }
  // Return the ids.
  return ids;
}

/// Maps pad id to pad text area.
var padTextArea = {};
/// Maps pad id to pad editor.
var padEditor = {};
/// Global variable to say whether any pad change has occured since last
/// HTML refresh.
var notClean = false;

/// Updates internal structures to reflect a new pad.
var internalNewPad = function(pad) {
  // Create holder text area.
  var textArea = document.createElement('textarea');
  editorAreas.appendChild(textArea);
  padTextArea[pad.id] = textArea;
  // Create the editor instance.
  var editor = createEditor(pad['filename'], textArea);
  textArea.nextSibling.style.display = 'none';
  editor.on('change', function() {
    notClean = true;
  });
  // Configuration.
  editor.setOption('extraKeys', {
    Tab: function(cm) {
      var spaces = '    ';
      cm.replaceSelection(spaces);
    },
    "Ctrl-Space": "autocomplete"
  });

  // Functions managing interaction with the socketio_client.
  blockedOrigins = ['external', 'setValue', 'aux']
  editor.on('beforeChange', function(instance, changeset) {
    // Do not propagate the update if it was from a different client.
    if (changeset.hasOwnProperty('origin')
        && blockedOrigins.indexOf(changeset['origin']) >= 0) {
        return;
    }
    // Skip if hits side, useful for comments.
    if (changeset['from']['hitSide']) {
      return;
    }
    console.log(JSON.stringify(changeset));
    onBeforeChange(changeset);
  });

  editor.on('update', function(instance, changeset) {
    // After change, update the position of showing comments.
    for (var i = 0; i < commentId; ++i) {
      var id = '#comment' + i;
      // If shown, show it again.
      var comment = $(id);
      if (typeof(comment) !== 'undefined' 
        && typeof(comment.data('bs.popover')) !== 'undefined'
        && comment.data('bs.popover').tip().hasClass('in')) {
        comment.popover('show');
      }
    }
  });
  
  // TODO(mihai): add retrieved bookmark comments.
  // Add the editor to the mapping.
  padEditor[pad.id] = editor;
  // Wrap text updates in one atomic operation.
  editor.operation(function() {
    // Set the content of the created pad.
    editor.setValue(pad.text);
    // Detect comments and display them properly.
    detectComments(editor);
  });
  // Clear history after initial version is set.
  editor.clearHistory();
}

// Request info about all pads.
// TODO(mihai): keep this in jinja, avoid problems with escaping.
var getContent = "/project/" + projectId + "/getAllPads";
$.get(getContent, function(serverPads) {
  pads = JSON.parse(serverPads);
  // Create code mirror instances for all pads.
  // TODO(mihai): remove this dependency.
  for (var i = 0; i < pads.length; ++i) {
    internalNewPad(pads[i]);
  }
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
  // Display the first pad on project loading.
  if (pads.length > 0) {
    updateDisplayedPad(pads[0].id);
  }
  $(document).ready(function() {
    $('[data-toggle="popover"]').popover({container:'body', animation:false});
  });
});

/// Editors to be removed on the text pad changing.
var tempTextAreas = [];

// Display the initial pad.
var updateDisplayedPad = function(padId) {
  // Remove temporary (previously deleted by someone) editors first.
  for (var i = 0; i < tempTextAreas.length; ++i) {
    tempTextAreas[i].nextSibling.style.display = 'none';
  }
  tempTextAreas = [];
  // Remove the instance already there, if it exists.
  if (displayedPad != -1) {
    padTextArea[displayedPad].nextSibling.style.display = 'none';
  }
  if (!(padId in padTextArea)) {
  }
  padTextArea[padId].nextSibling.offsetHeight;
  padTextArea[padId].nextSibling.style.display = 'block';
  padEditor[padId].refresh();
  // Focus editor.
  padEditor[padId].focus();
  displayedPad = padId;
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

/**
 * Expands the comments existing in a pad to occupy real space.
 */
var expandEditorComments = function(padId) {
  var editor = padEditor[padId];
  // Traverse markers and replace them with non-zero range.
  var allMarks = editor.getAllMarks();
  for (var i = 0; i < allMarks.length; ++i) {
    // Skip update if mark is unexpandable.
    var marker = allMarks[i];
    if (isUnexpandable(marker)) {
      continue;
    }
    var markerPosition = marker.find();
    editor.replaceRange(Array(21).join('a'), 
      markerPosition, markerPosition, 'aux');
  }
}

/**
 * Collapses the comments existing in a pad to avoid being seen by user.
 */
var collapseEditorComments = function(padId) {
  var editor = padEditor[padId];
  // Traverse markers and replace them with zero range.
  var allMarks = editor.getAllMarks();
  for (var i = 0; i < allMarks.length; ++i) {
    // Skip update if mark is unexpandable.
    var marker = allMarks[i];
    if (isUnexpandable(marker)) {
      continue;
    }
    var startPosition = marker.find();
    var endPosition = {
      'line': startPosition['line'],
      'ch': startPosition['ch'] + 20
    };
    editor.replaceRange('', startPosition, endPosition, 'aux');
  }
}

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
  var editor = padEditor[padId];
  // Add new comments to allComments.
  if ('comments' in changeset) {
    for (var code in changeset['comments']) {
      allComments[code] = changeset['comments'][code];
    }
  }
  // Ids of comments to be shown after creation.
  var ids;
  // Wrap everything in an atomic operation.
  editor.operation(function() {
    // Expand code comments to occupy real space in editor.
    expandEditorComments(padId);
    // Prepare change application.
    var prevContent = editor.getValue('');
    console.assert(
      changeset.baseLen === prevContent.length, "cannot apply change");
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
    // Compact code comments to no longer occupy space in editor.
    collapseEditorComments(padId);
    // Expand possible newly added comments.
    ids = detectComments(editor);
  });
  // Clear undo history after other client update.
  editor.clearHistory();
  // Enable bootstrap popover.
  $(document).ready(function() {
    $('[data-toggle="popover"]').popover({container:'body', animation:false});
    // Popup required comments.
    for (var i = 0; i < ids.length; ++i) {
      $(ids[i]).popover('show');
    }
  });
};

/**
 * Reflects a file manipulation from another client internally.
 */
var processExternalFileManipulation = function(manipulation) {

  if (manipulation['type'] === 'new') {
    // Create new pad and insert it in the pads list.
    pad = {
      'id': manipulation['padId'],
      'filename': manipulation['filename'],
      'text': manipulation['text'],
      'baseRev': manipulation['baseRev'],
    };
    pads.push(pad);
    // Reflect internally the new pad.
    internalNewPad(pad);
    // Init changesets & padById.
    pad.csA = new Changeset(pad.text.length);
    pad.csX = new Changeset(pad.text.length);
    pad.csY = new Changeset(pad.text.length);
    padById[pad.id] = pad;
  } else {
    if (manipulation['type'] === 'rename') {
      // Update filename.
      var padId = manipulation['padId'];
      var padName = manipulation['filename'];
      padById[padId].filename = padName;
    } else if (manipulation['type'] === 'delete') {
      // Remove the corresponding pad.
      var padId = manipulation['padId'];
      for (var i = 0; i < pads.length; ++i) {
        if (pads[i].id == padId) {
          // Add this editor in the list of temporary ones.
          tempTextAreas.push(padTextArea[pads[i].id]);
          pads.splice(i, 1);
          break;
        }
      }
    }
    // If other update than 'new', refresh file tree.
    refreshFileTree();
  }
}

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


//Code running
function runJScode() {
    var mypre = document.getElementById("output");
    mypre.innerHTML = "";
    interceptConsoleLogs(mypre);
    var js = padEditor[displayedPad].getValue();
    var s = document.createElement('script');
    s.textContent = js; 
    document.body.appendChild(s);
    restoreConsole();
}

var lines_modified = 0;

function interceptConsoleLogs(mypre) {
    (function() {
      var oldLog = console.log;
      console.log = function (message) {
          outf(message);
          oldLog.apply(console, arguments);
      };
    })();
}

function restoreConsole(){
    delete console.log;
}


function outf(text) { 
    var mypre = document.getElementById("output"); 
    mypre.innerHTML = mypre.innerHTML + text; 
} 

function builtinRead(x) {
    if (Sk.builtinFiles === undefined || 
                        Sk.builtinFiles["files"][x] === undefined)
            throw "File not found: '" + x + "'";
    return Sk.builtinFiles["files"][x];
}

function getCurrentPad() {
  return padById[displayedPad].filename;
}

function runit() {
   lines_modified = 0;
   var prog = preprocess(padEditor[displayedPad].getValue(), 2, 
                                                  [getCurrentPad()], 1); 
   var mypre = document.getElementById("output"); 
   mypre.innerHTML = ''; 
   Sk.pre = "output";
   Sk.configure({output:outf, read:builtinRead}); 
   (Sk.TurtleGraphics || (Sk.TurtleGraphics = {})).target = 'frameview';
   var myPromise = Sk.misceval.asyncToPromise(function() {
        return Sk.importMainWithBody("<stdin>", false, prog, true);
   });
   myPromise.then(function(mod) {
   },
       function(err) {
       if(err.traceback[0]["lineno"] <= lines_modified) {
         outf("Error in imported files.");
       } else {
         err.traceback[0]["lineno"] = err.traceback[0]["lineno"] 
                                                - lines_modified; 
         outf(err.toString());
       }
   });
   showConsole();
   $('#frameview').addClass("col-xs-4")
}

var stack = [];
var initialFile;
function preprocess(text, type, filelist, initial) {
  if(type === 1) {
    var regex = new RegExp('<[\\s\\t]*script.*src[\\s\\t]*=[^>]*>', 'gi');
    var regex2 = new RegExp('<[\\s\\t]*link.*rel[\\s\\t]*=
                              [\\s\\t]*(\"|\')stylesheet\\1[^>]*>', 'gi');
    var res;
    while((res = regex.exec(text)) !== null) {
      var filename = /src[\s\t]*=[\s\t]*("|')[^"^']*\1/gi.exec(res[0]);
      if (filename == null) {
        continue;
      }
      filename = filename[0].split(/[\'\"]/);
      filename = filename[1];
      var toReplace = res[0].replace(/src[\s\t]*=[\s\t]*["'][^"^']*["']/gi, '');
      var indexToAdd = res.index + res[0].length;
      if (findPad(filename) == null)
        continue;
      text = text.slice(0, indexToAdd) + "\n" + findPad(filename) 
                                              + text.slice(indexToAdd);
      text = text.replace(res[0], toReplace);
    } 
    while((res = regex2.exec(text)) !== null) {
      var filename = /href[\s\t]*=[\s\t]*("|')[^"^']*\1/gi.exec(res[0])
      if(filename == null) {
        continue;
      }
      filename = filename[0].split(/[\'\"]/);
      filename = filename[1];
      var toReplace = res[0].replace(/rel[\s\t]*=
                                         [\s\t]*["']stilesheet["']/gi, '');
      toReplace = toReplace.replace(/href[\s\t]*=[\s\t]*["'][^"^']*["']/gi, '');
      toReplace = toReplace.replace('link', 'style');
      var indexToAdd = res.index + res[0].length;
      if (findPad(filename) == null)
        continue;
      text = text.slice(0, indexToAdd) + "\n" + findPad(filename) 
                              + "\n </style>" + text.slice(indexToAdd);
      text = text.replace(res[0], toReplace);
    } 
  } else {
    if(initial === 1) {
      initialFile = filelist.pop();
    }
    var regex = new RegExp ('import[^;\\n\\r]*', 'g');
    //TODO from X import Y;
    var res;
    while((res = regex.exec(text)) !== null) {
      var classname = res[0].split(/\s+/);
      classname = classname.filter(Boolean).pop();
      classname = classname.replace(/\r?\n|\r/, '');
      classname = classname.replace(/\s/g, '');
      var filename = res[0].split(/\s+/);
      filename = filename.filter(Boolean)[1];
      filename = filename.replace(/[\s\t]+as.*/, '');
      filename = filename.replace(/\s/g, '');
      filename = filename.replace(/\./g, '/');
      filename = '/' + filename + ".py";
      var indexToAdd = res.index;
      var indexAfterAdd = indexToAdd + res[0].length;
      if(text.slice(indexAfterAdd, indexAfterAdd + 1) === ';'){
        indexAfterAdd += 1;
      }
      if(filename === initialFile) {
        var text = text.slice(0, indexToAdd) + text.slice(indexAfterAdd);
        console.log(filename);
        continue;
      }
      stack.push(classname);
      if(filelist.indexOf(classname) > -1) {
        var text = text.slice(0, indexToAdd) + 
                                  text.slice(indexAfterAdd).replace(/\s*/, '');
      } else {
        filelist.push(classname);
        if (findPad(filename) == null) {
          console.log(filename);
          stack.pop();
          continue;
        }
        var to_add = preprocess(findPad(filename), 2, filelist, 0)
        lines_modified = count_lines(to_add) + lines_modified + 3;
        text = text.replace(new RegExp(classname + "\\.", "g"), 
                                                      stack.join('.') + '.');
        text = text.slice(0, indexToAdd) + 'class ' + classname + ':\n' 
                + identPython(to_add) + "\n" 
                + text.slice(indexAfterAdd).replace(/\s*/, '');
      }
      stack.pop();
      classregex = new RegExp(classname, 'g');
      text = text.replace(classregex, classname.replace(/\./g, '_'));
      console.log(text);
    }
  }
  return text; 
}

function identPython(str) {
  str = str.split(/\n\r|\r|\n/)
  for( var i = 0; i < str.length; i++ ) {
    str[i] = '    ' + str[i]; 
  }
  return str.join('\n');
}

function count_lines(str) {
  return str.split(/\n\r|\r|\n/).length
}

function findPad(text) {
  for (var i = 0; i < pads.length; i++) {
    if(pads[i].filename === text) {
      if (!(pads[i].id in padEditor)) {
        return null;
      }
      return padEditor[pads[i].id].getValue();
    }
  }
  return null;
}

webViewToggleButton.click(toggleWebView);
