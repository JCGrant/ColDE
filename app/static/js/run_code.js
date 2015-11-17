function runJScode() {
    var mypre = document.getElementById("output"); 
    mypre.innerHTML = "";
    takeOverConsole(mypre);
    var js = editor.getValue();
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



function runHTML() {
    var web = editor.getValue();
    var myPre = document.getElementById("webview");
    myPre.innerHTML = web; 
}

function runPYcode() {
    var mypre = document.getElementById("output"); 
    takeOverConsole(mypre);
    var py = editor.getValue();
    pypyjs.exec(py);
    restoreConsole();
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

$("#clickSkulpt").click(runit);
$("#clickJs").click(runJScode);
$("#clickHTML").click(runHTML);
$("#clickPy").click(runPYcode);


