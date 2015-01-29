var abc = 0;
$(document).ready(function() {
    $('#add_more').click(function() {
        $("#textarea-id").before(
            $("<div/>",
                {id: 'filediv'})
                //.addClass("form-group")
            .fadeIn('slow').append(
            $("<input>",
                {
                    name: 'file[]',
                    type: 'file',
                    id: 'file'
                }
            ).addClass("form-control"), $("<br/>")));
    });

    $('body').on('change', '#file', function() {
        console.log("CHANGED");
        if (this.files && this.files[0]) {
            console.log(abc);
            abc++;
            var z = abc - 1;
            var x = $(this).parent().find('#previewimg' + z).remove();
            $(this).before("<div id='abcd" + abc + "' class='multi-upload'><img id='previewimg" + abc + "' src=''/></div>");
            var reader = new FileReader();
            reader.onload = imageIsLoaded;
            reader.readAsDataURL(this.files[0]);
            $(this).hide();
            $("#abcd" + abc).append($("<img/>", {
                id: 'img-multi-upload',
                src: '../../img/x.png',
                alt: 'delete'
            }).click(function() {
                $(this).parent().parent().remove();
            }));
        }
    });

    function imageIsLoaded(e) {
        if(e.target.result.indexOf("data:image"))
            $('#previewimg' + abc).attr('src', '../../img/file_placeholder.png');
        else
            $('#previewimg' + abc).attr('src', e.target.result);

    };

    $('#upload').click(function(e) {
        var name = $(":file").val();
        if (!name) {
            alert("At least one file must be selected");
            e.preventDefault();
        }
    });
});