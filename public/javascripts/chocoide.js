// Global variable for Choco samples
var samples;

window.onload = function () {
    // Fullfill drilldown list with Choco samples
    updateSamples();

    // Initializing Ace editor
    ace.require("ace/ext/language_tools");
    var editor = ace.edit("editor");
    editor.setTheme("ace/theme/monokai");
    editor.getSession().setMode("ace/mode/choco");
    editor.$blockScrolling = Infinity;
    editor.setOptions({
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: false
    });

    // Event handler when selected value has changed
    $('#samples').change(function () {

        var filenameSelectedSample = $('#samples option:selected').val();

        var jsonSamples = jQuery.parseJSON(samples);
        jsonSamples.forEach(function (jsonSample) {
            if (filenameSelectedSample == jsonSample.filename) {
                editor.getSession().setValue(jsonSample.content);
            }
        });
    });

    // Event handler when submitting a report
    $("#reportForm").submit(function(event) {
        event.preventDefault();
        var email = $('#emailReport').val();
        var comment = $('#commentReport').val();
        sendReport(email, comment); // call the report service
        $('#reportModal').modal('hide'); // hide the report form
        $('#reportForm')[0].reset(); // clear the report form
        return false; // avoiding event to be processed
    });

    settingDragNDrop();
}

function updateSamples() {
    var select = $('#samples');

    // Fire the HTTP GET request
    var request = $.ajax({
        url: "/getCodeSampleList",
        type: "get"
    });

    request.done(function (response, textStatus, jqXHR) {
        // Updating the model
        samples = response;

        // Updating the initial code in Ace editor
        ace.edit("editor").getSession().setValue(jQuery.parseJSON(samples)[0].content);
        var jsonSamples = jQuery.parseJSON(response);

        // Updating the drilldown
        jsonSamples.forEach(function (jsonSample) {
            var option = document.createElement("option");
            option.text = jsonSample.name;
            option.value = jsonSample.filename;
            select.append(option);
        });
    });

    request.fail(function (jqXHR, textStatus, errorThrown) {
        // Log the error to the console
        console.error(
            "The following error occurred: "+
            textStatus, errorThrown
        );
    });
}

function defineAceKeywords(){

}


function compile() {
    var editor = ace.edit("editor");
    var code = editor.getSession().getValue();
    var consoleCode = document.getElementById('console');

    // Fire the HTTP POST request
    var request = $.ajax({
        url: "/compile",
        type: "post",
        data: {body: code}
    });

    // Callback handler that will be called on success - HTTP 200 OK
    request.done(function (response, textStatus, jqXHR){
        var compilationEvents = response.errors;
        var runtimeEvents = response.events;

        consoleCode.innerHTML = "";

        compilationEvents.forEach(function(compilationEvent) {
            consoleCode.innerHTML += "<p class=\"compilationErr\">" + "Error during compilation : " + compilationEvent + "</p>";
        });

        runtimeEvents.forEach(function(runtimeEvent) {
            var className = "stdOut";
            if(runtimeEvent.kind == "stderr") {
                className = "stdErr"
            }
            consoleCode.innerHTML += "<p class="+className+">" + runtimeEvent.message + "</p>";
        });
    });


    // Callback handler that will be called on failure
    request.fail(function (jqXHR, textStatus, errorThrown) {
        // Log the error to the console
        console.error(
            "The following error occurred: "+
            textStatus, errorThrown
        );
    });
}


function sendReport(userEmail, comment) {
    var editor = ace.edit("editor");
    var sourceCode = editor.getSession().getValue();

    var compilationErrs ="", stdOuts="", stdErrs="";
    $('.compilationErr').each(function() {
        compilationErrs += $(this).text() + "\n"
    });

    $('.stdOut').each(function() {
        stdOuts += $(this).text() + "\n"
    });

    $('.stdErr').each(function() {
        stdErrs += $(this).text() + "\n"
    });

    // Fire the HTTP POST request
    var request = $.ajax({
        url: "/reportError",
        type: "post",
        data: {
            sourceCode: sourceCode,
            userEmail: userEmail,
            stdOut: stdOuts,
            stdErr: stdErrs,
            compilationErr: compilationErrs,
            comment: comment
        }
    });

    // Callback handler that will be called on success - HTTP 200 OK
    request.done(function (response, textStatus, jqXHR){
        $('#alertReportSuccess').modal('show');
    });

    // Callback handler that will be called on failure
    request.fail(function (jqXHR, textStatus, errorThrown){
        $('#alertReportFailure').modal('show');

        // Log the error to the console
        console.error(
            "The following error occurred: "+
            textStatus, errorThrown
        );
    });
}

function settingDragNDrop(){
    var dropZone = document.getElementById("editor");

    window.ondragover = function(e){
        e.preventDefault();
    };

    window.ondrop = function(e){
        e.preventDefault();
    };

    dropZone.ondragover = function(e){
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.dropEffect = 'copy';
        e.preventDefault();
    };

    dropZone.ondrop = function(e){
        e.preventDefault();
        var data = e.dataTransfer;
        if ('files' in data && data.files[0].type.indexOf("text")!=-1){
            var reader = new FileReader();
            reader.readAsText(e.dataTransfer.files[0]);

            reader.onloadend=function() {
                if (reader.readyState==reader.DONE) {
                    ace.edit("editor").getSession().setValue(reader.result);
                }
            };
        }else{
            console.log("No valid element dropped");
        }
    };
}
