function createNewPad() {
	var padName = document.getElementById("padName").value;
	window.location.href += 'pad/new?filename=' + padName;
}

$('#createNewPadButton').click(createNewPad);
