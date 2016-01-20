webViewOpen = false;
var webViewToggleButton = $("#toggleWebView");
var url = window.location.href;
var split = url.split("/");
var project = split[4];

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
    editorview.removeAttribute("style");
    webViewOpen = false;
    webViewToggleButton.html('Open Graphical View <span class="glyphicon glyphicon-modal-window"></span>');
    $('#frameview').html('');
    frameview.className = '';
  }
}

// function leaveProject(user) {
//   var request = "/project/" + project + "/leave_project" + "?username=" + user;
//   $.get(request);
//   window.location.href = "/";
// }

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

$delUserSelect = $('#delUserSelect');
$('#delUserButton').click(function() {
  $.get('/project/' + projectId + '/users' + "?user=" + current_user, function(data) {
    $options = ''
    data.users.forEach(function(user) {
      $options += '<option>' + user.username + '</option>';
    });
    $delUserSelect.html($options);
  });
});

$newUserSelect.select2();
$delUserSelect.select2();

$('.delete-project-button').click(function() {
  var p_id = $(this).data('p_id');
  $.get('/project/' + p_id + '/delete/', function(data) {
    window.location.href = '/project/' + projectId;
  });
});
