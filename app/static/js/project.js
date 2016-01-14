webViewOpen = false;
var webViewToggleButton = $("#toggleWebView");

function toggleWebView() {
  if (webViewOpen) {
    closeConsole();
  } else {
    notClean = true;
    showConsole();
  }
}

function showConsole() {
  if(document.getElementById("webview") == null) {
    var editorview = document.getElementById("editorview");
    var frameview = document.getElementById("frameview");
    editorview.className = "col-xs-4";
    var frame = document.createElement("iframe");
    frame.className = "col-xs-4";
    frame.style.height = "79vh";
    frame.scrolling = "yes";
    frame.frameBorder = "0";
    // frame.sandbox = "allow-same-origin allow-scripts allow-popups allow-forms";
    frame.id = "webview";
    frameview.appendChild(frame);
    webViewOpen = true;
    webViewToggleButton.html('Close Graphical View <span class="glyphicon glyphicon-modal-window"></span>');
  }
}

function closeConsole() {
  if(document.getElementById("webview") != null) {
    var editorview = document.getElementById("editorview");
    var frameview = document.getElementById("frameview");
    var child = document.getElementById("webview");
    frameview.removeChild(webview);
    editorview.className = "col-xs-8";
    webViewOpen = false;
    webViewToggleButton.html('Open Graphical View <span class="glyphicon glyphicon-modal-window"></span>');
    $('#frameview').html('');
    frameview.className = '';
  }
}

$newUserSelect = $('#newUserSelect');
$('#newUserButton').click(function() {
  $.get('/project/' + projectId + '/users_not_in_project/', function(data) {
    $options = ''
    data.users.forEach(function(user) {
      $options += '<option>' + user.username + '</option>';
    });
    $newUserSelect.html($options);
  });
});

$newUserSelect.select2();
