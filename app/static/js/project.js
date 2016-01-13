webViewOpen = false;
var webViewToggleButton = $("#toggleWebView");

function toggleWebView() {
  if (webViewOpen) {
    closeConsole();
  } else {
    notClean = true;
    showConsole();
  }
  webViewOpen = !webViewOpen;
  var webVIewToggleButtonText = (webViewOpen ? 'Close' : 'Open') + ' Web View ' + '<span class="glyphicon glyphicon-modal-window"></span>';
  webViewToggleButton.html(webVIewToggleButtonText);
}

function showConsole() {
  if(document.getElementById("webview") == null) {
    var editorview = document.getElementById("editorview");
    var frameview = document.getElementById("frameview");
    editorview.className = "col-xs-4";
    var frame = document.createElement("iframe");
    frame.className = "col-xs-4";
    frame.scrolling = "yes";
    frame.frameBorder = "0";
    // frame.sandbox = "allow-same-origin allow-scripts allow-popups allow-forms";
    frame.id = "webview";
    frameview.appendChild(frame);
  }
}

function closeConsole() {
  if(document.getElementById("webview") != null) {
    var editorview = document.getElementById("editorview");
    var frameview = document.getElementById("frameview");
    var child = document.getElementById("webview");
    frameview.removeChild(webview);
    editorview.className = "col-xs-8";
  }
}

$('#newUserSelect').select2();
