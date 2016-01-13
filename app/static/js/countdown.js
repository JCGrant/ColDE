var first = true;

function countdown() {
	if (!first) {
		postMessage('message');
	}
	first = false;
	setTimeout("countdown()", 500);
};

countdown();
