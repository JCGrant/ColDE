webViewOpen = false;
var webViewToggleButton = $("#toggleWebView");


function toggleWebView() {
  if (webViewOpen) {
    closeConsole();
    closeResize();
  } else {
    notClean = true;
    showConsole();
    openResize();
  }
}

function showConsole() {
  if(document.getElementById("webview") == null) {
    var editorview = document.getElementById("editorview");
    var frameview = document.getElementById("frameview");
    editorview.className = "col-xs-6";
    var frame = document.createElement("iframe");
    frame.className = "col-xs-6";
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
    frameview.removeChild(child);
    editorview.className = "col-xs-12";
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
