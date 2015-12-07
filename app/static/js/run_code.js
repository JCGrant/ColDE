function runJScode() {
    var mypre = document.getElementById("output");
    mypre.innerHTML = "";
    takeOverConsole(mypre);
    var js = padEditor[displayedPad].getValue();
    var s = document.createElement('script');
    s.textContent = js; 
    document.body.appendChild(s);
    restoreConsole();
}

function takeOverConsole(mypre){
    var console = window.console;
    if (!console) return;
    function intercept(method){
        var original = console[method];
        console[method] = function(){
            mypre.innerHTML = mypre.innerHTML + arguments[0] + "\n";
            if (original.apply){
                // Do this for normal browsers
                original.apply(console, arguments);
            }else{
                // Do this for IE
                var message = Array.prototype.slice.apply(arguments).join(' ');
                original(message);
            }
        }
    }
    var methods = ['log', 'warn', 'error'];
    for (var i = 0; i < methods.length; i++)
        intercept(methods[i]);
}

function restoreConsole(){
    delete console.log;
}


function outf(text) { 
    var mypre = document.getElementById("output"); 
    mypre.innerHTML = mypre.innerHTML + text; 
} 

function builtinRead(x) {
    if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
            throw "File not found: '" + x + "'";
    return Sk.builtinFiles["files"][x];
}

function runit() {
   var prog = padEditor[displayedPad].getValue();  
   var mypre = document.getElementById("output"); 
   mypre.innerHTML = ''; 
   Sk.pre = "output";
   Sk.configure({output:outf, read:builtinRead}); 
   (Sk.TurtleGraphics || (Sk.TurtleGraphics = {})).target = 'mycanvas';
   var myPromise = Sk.misceval.asyncToPromise(function() {
        return Sk.importMainWithBody("<stdin>", false, prog, true);
   });
   myPromise.then(function(mod) {
       console.log('success');
   },
       function(err) {
       console.log(err.toString());
   });
}

function showConsole() {
  if(document.getElementById("webview") == null) {
    var editorview = document.getElementById("editorview");
    var frameview = document.getElementById("frameview");
    editorview.className = "col-md-5";
    var frame = document.createElement("iframe");
    frame.className = "col-md-5";
    frame.scrolling = "yes";
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

function preprocess(text, type) {
  if(type === 1) {
    var regex = new RegExp('<[\\s|\\t]*script.*src[\\s|\\t]*=[^>]*>', 'gi');
    var regex2 = new RegExp('<[\\s|\\t]*link.*rel[\\s|\\t]*=[\\s|\\t]*"stylesheet"[^>]*>', 'gi');
    var res;
    while((res = regex.exec(text)) !== null) {
      var filename = /src[\s|\t]*=[\s|\t]"[^"]*"/gi.exec(res[0])
      filename = filename[0].split(/[\'|\"]/);
      filename = filename[1];
      var toReplace = res[0].replace(/src[\s|\t]*=[\s|\t]"[^"]*"/gi, '');
      indexToAdd = res.index + res[0].length;
      if (findPad(filename) == null)
        continue;
      var text = text.slice(0, indexToAdd) + "\n" + findPad(filename) + text.slice(indexToAdd);
      text = text.replace(res[0], toReplace);
    } 
    while((res = regex2.exec(text)) !== null) {
      var filename = /href[\s|\t]*=[\s|\t]"[^"]*"/gi.exec(res[0])
      filename = filename[0].split(/[\'|\"]/);
      filename = filename[1];
      var toReplace = res[0].replace(/rel[\s|\t]*=[\s|\t]"stilesheet"/gi, '');
      toReplace = toReplace.replace(/href[\s|\t]*=[\s|\t]"[^"]*"/gi, '');
      toReplace = toReplace.replace('link', 'style');
      indexToAdd = res.index + res[0].length;
      if (findPad(filename) == null)
        continue;
      var text = text.slice(0, indexToAdd) + "\n" + findPad(filename) + "\n </style>" + text.slice(indexToAdd);
      text = text.replace(res[0], toReplace);
    } 
  return text;
  } else {
    //TODO : python imports :( 
  }
}

function findPad(text) {
  for (i = 0; i < pads.length; i++) {
    if(pads[i].filename === text) {
      return pads[i].text;
    }
  }
}

$("#clickSkulpt").click(runit);
$("#clickJs").click(runJScode);
$("#clickCloseConsole").click(closeConsole);
$("#clickShowConsole").click(showConsole);



