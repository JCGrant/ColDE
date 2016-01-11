function createNewProject() {
	var projectName = document.getElementById("projectName").value;
	window.location.href = "project/new?title=" + projectName;
}
