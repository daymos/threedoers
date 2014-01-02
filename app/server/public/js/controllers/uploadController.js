function UploadController()
{

// handle design upload

	$(document)addEventListener("DOMContentLoaded", function(){

    // Initialize instances:
    var socket = io.connect();
    var siofu = new SocketIOFileUpload(socket);

    // Configure the three ways that SocketIOFileUpload can read files:
    document.getElementById("upload_btn").addEventListener("click", siofu.prompt, false);
    siofu.listenOnInput(document.getElementById("upload_input"));
    siofu.listenOnDrop(document.getElementById("file_drop"));

    // Do something when a file is uploaded:
    siofu.addEventListener("complete", function(event){
        console.log(event.success);
        console.log(event.file);
    });

}, false);

}