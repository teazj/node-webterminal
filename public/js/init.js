$(document).ready(init);

function init()
{
	$("body").keypress(submitInput);
	$("#cursor").focus();
}

function submitInput(event)
{
	if (event.which == 13)
	{
		var input = $("#cursor").val();
		$("#cursor").val("");

		appendRequest(input);
		IoWrapper.send(input);
	}
}

function appendRequest(req)
{
	$("#output").append(req);
	$("#output").append("<br />");
}

function appendResponse(res)
{
	$("#output").append(res);
}
