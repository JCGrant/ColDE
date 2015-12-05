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
   var prog = editor.getValue();  
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
    frame.sandbox = "";
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

$("#clickSkulpt").click(runit);
$("#clickJs").click(runJScode);
$("#clickCloseConsole").click(closeConsole);
$("#clickShowConsole").click(showConsole);



