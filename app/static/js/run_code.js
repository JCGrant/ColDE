function runJScode() {
    var js = editor.getValue();
    var s = document.createElement('script');
    s.textContent = js; 
    document.body.appendChild(s);
}

function runPYcode() {
    var py = editor.getValue();
    pypyjs.exec(py);
}

$("#clickJs").click(runJScode);
$("#clickPy").click(runPYcode);


