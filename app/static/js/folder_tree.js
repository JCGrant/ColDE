var url = window.location.href;
var split = url.split("/");
var project = split[4];
var tree = $("#container").jstree({
    'core' : {
      "check_callback" : true,
    	'data' : {
        	"url" : "/project/" + project + "/filesJSON",
        	"dataType" : "json",
        	"data" : function (node) {
          		return { "id" : node.id };
        	}
      	}
     }, 
	'plugins' : ["contextmenu", "dnd"]
});   

tree.on("create_node.jstree", function(e, data) {
  var parent = data.node.parent;
  //alert(JSON.stringify(data));
  //alert("/project/4/pad/new" + "?parent=" + parent + "&filename=" + "New node")
  $.get("/project/" + project +"/pad/new" + "?parent=" + parent + "&filename=" + "New node");
});

tree.on("rename_node.jstree", function(e, data) {
  //Name is the new value
  var name = data.node.text;
  var old_name = data.node.original.text;
  var parent = data.node.parent;
  //alert(JSON.stringify(data));  //alert(JSON.stringify(data));
  //alert("project/4/pad/rename" + "?parent=" + parent + "&filename=" + name + "&new=" + "new");
  $.get("/project/" + project + "/pad/rename" + "?parent=" + parent + "&filename=" + old_name + "&new=" + name);
  /*$.get("/project/" + project + "/pad/getPad" + "?id=" + id, function(data) {
    obj = JSON.parse(data);
    alert(JSON.stringify(data));
 
  });
*/
  location.reload();
  tree.jstree("refresh"); 
});

tree.on("delete_node.jstree", function(e,data) {
  var parent = data.node.parent;
  var name = data.node.text;
  $.get("/project/" + project + "/pad/delete" + "?parent=" + parent + "&filename=" + name);
  tree.jstree("refresh");
});

tree.on("select_node.jstree", function(e, data) {
  var id = data.node.id;
  $.get("/project/" + project + "/pad/getPad" + "?id=" + id, function(data) {
    obj = JSON.parse(data);
    //alert(obj.id);
    if(obj.id != "-1") {
      /*if(typeof(padTextArea[obj.id]) == "undefined") {
        createEditorPad(obj);
        pads.push(obj);
      }*/
      
      updateDisplayedPad(parseInt(obj.id));
    } 
  });
});

function createEditorPad(pad) {
  console.log('before iniit ' + i);
  // Create holder text area.
  var textArea = document.createElement('textarea');
  editorAreas.appendChild(textArea);
  padTextArea[pad.id] = textArea;
  console.log('initialise ' + pad.id);
  // Create the editor instance.
  var editor = createEditor(pad["filename"])
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
    onBeforeChange(changeset);
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
}