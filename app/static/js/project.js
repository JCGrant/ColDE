function createNewPad() {
	var padName = document.getElementById("padName").value;
	window.location.href += 'pad/new?filename=' + padName;
}

$('#createNewPadButton').click(createNewPad);

webViewOpen = false;
var webViewToggleButton = $("#toggleWebView");

function toggleWebView() {
  if (webViewOpen) {
    closeConsole();
  } else {
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
    editorview.className = "col-md-5";
    var frame = document.createElement("iframe");
    frame.className = "col-md-5";
    frame.scrolling = "yes";
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
    editorview.className = "col-md-10";
  }
} 
