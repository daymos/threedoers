var abc = 0;
$(document).ready(function() {
    $('#add_more').click(function() {
        $(this).before($("<div/>", {
            id: 'filediv'
        }).fadeIn('slow').append($("<input/>", {
            name: 'file[]',
            type: 'file',
            id: 'file'
        }), $("<br/><br/>")));
    });

    $('body').on('change', '#file', function() {
        if (this.files && this.files[0]) {
            abc += 1;
            var z = abc - 1;
            var x = $(this).parent().find('#previewimg' + z).remove();
            $(this).before("<div id='abcd" + abc + "' class='abcd'><img id='previewimg" + abc + "' src=''/></div>");
            var reader = new FileReader();
            reader.onload = imageIsLoaded;
            reader.readAsDataURL(this.files[0]);
            $(this).hide();
            $("#abcd" + abc).append($("<img/>", {
                id: 'img',
                src: '../../img/x.png',
                alt: 'delete'
            }).click(function() {
                $(this).parent().parent().remove();
            }));
        }
    });

    function imageIsLoaded(e) {
        $('#previewimg' + abc).attr('src', e.target.result);
    };
    $('#upload').click(function(e) {
        var name = $(":file").val();
        if (!name) {
            alert("First Image Must Be Selected");
            e.preventDefault();
        }
    });
});