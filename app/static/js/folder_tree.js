var url = window.location.href;
var split = url.split("/");
var project = split[4];
var tree = $("#container").jstree({
    'core' : {
      "check_callback" : true,
      "themes" : { "stripes" : true },
    	'data' : {
        	"url" : "/project/" + project + "/filesJSON",
        	"dataType" : "json",
        	"data" : function (node) {
          		return { "id" : node.id };
        	}
      	}
     }, 
  'contextmenu' : { 'items' : customMenu },
	'plugins' : ["contextmenu"]
});

// Expand tree on both loaded & refresh.
tree.on("loaded.jstree", function() {
  tree.jstree('open_all');
});
tree.on("refresh.jstree", function() {
  tree.jstree('open_all');
});

tree.on("create_node.jstree", function(e, data) {
  var parent = data.node.parent;
  var type = data.node.original.nodetype;
  // Create GET content.
  var getContent = "/project/" + project +"/pad/new" + "?parent=" + 
    parent + "&filename=" + "New node" + "&type=" + type;
  $.get(getContent);
});

tree.on("rename_node.jstree", function(e, data) {
  // Name is the new value.
  var name = data.node.text;
  var old_name = data.node.original.text;
  var parent = data.node.parent;
  // Create GET content.
  var getContent = "";
  if (data.node.parent !== '#') {
    getContent = "/project/" + project + "/pad/rename" + "?parent=" + 
      parent + "&filename=" + old_name + "&new=" + name;
  } else {
    getContent = "/project/" + project + "/rename" + "?new_title=" + name;
  }
  $.get(getContent);
  refreshFileTree();
});

tree.on("delete_node.jstree", function(e, data) {
  var parent = data.node.parent;
  var name = data.node.text;
  // Create GET content.
  var getContent = "/project/" + project + "/pad/delete" + "?parent=" + 
    parent + "&filename=" + name;
  $.get(getContent);
  refreshFileTree();
});

tree.on("select_node.jstree", function(e, data) {
  var id = data.node.id;
  // TODO(mihai): get for pad change?
  $.get("/project/" + project + "/pad/getPad" + "?id=" + id, function(data) {
    obj = JSON.parse(data);
    if(obj.id != "-1") {
      // Other file selected, update currently displayed pad.
      updateDisplayedPad(parseInt(obj.id));
    } 
  });
});

var refreshFileTree = function() {
  tree.jstree("refresh");
}

function customMenu(node) {
    // The default set of all items
    var items = {

        createFileItem : { // The "delete" menu item
            label: "Create File",
            action: function (data)   {
              var inst = $.jstree.reference(data.reference),
              obj = inst.get_node(data.reference);
              inst.create_node(obj, {'nodetype' : 'filenode'}, "last", function (new_node) {
              //alert(JSON.stringify(new_node));
              new_node.icon = "glyphicon glyphicon-file"
              setTimeout(function () { inst.edit(new_node); },0);
            });
          }
        },

        createItem : { // The "delete" menu item
            label: "Create Folder",
            action: function (data) {   
              var inst = $.jstree.reference(data.reference),
              obj = inst.get_node(data.reference);
              inst.create_node(obj, {'nodetype' : 'foldernode'}, "last", function (new_node) {
              //alert(JSON.stringify(new_node));
              setTimeout(function () { inst.edit(new_node); },0);
            });
          }
        },

        renameItem: { // The "rename" menu item
            label: "Rename",
            action: function (data) {
                var inst = $.jstree.reference(data.reference),
                obj = inst.get_node(data.reference);
                inst.edit(obj);
            }
        },

        deleteItem: { // The "delete" menu item
            label: "Delete",
            action: function (data) {
                var inst = $.jstree.reference(data.reference),
                obj = inst.get_node(data.reference);
                if(inst.is_selected(obj)) {
                  inst.delete_node(inst.get_selected());
                }else {
                  inst.delete_node(obj);
                }
            }
        }
    };
    // Prevent adding children to file.
    if(node.original.type === 'file') {
      delete items.createItem;
      delete items.createFileItem;
    }
    // No delete options on root folder.
    if (node.parent === '#') {
      delete items.deleteItem; 
    }

    return items;
}
