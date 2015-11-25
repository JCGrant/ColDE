
var first = true;
countdown();

var tick;

function countdown() {
	if (!first) {
		tick();
	}
	first = false;
	setTimeout(countdown, 500);
};
