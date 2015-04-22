//= require "vendor/jquery"
//= require "vendor/jquery.bxslider"

$( document ).ready(function() {

$('#bxslider').bxSlider({auto: true});
$(".info_projects").last().find(".separator").css("display","none");
$(".info_archived").last().find(".separator").css("display","none");
$(".info_jobs_available").last().find(".separator").css("display","none");
});

function toggle(){
  $(".myprofileitem").fadeToggle('slow','linear');
}

$(".flange ul li").click(function(){
    $(".flange ul li .activeline").css("display","none");
    $(".flange ul li").css({"border": "none", "border-bottom":"#7BF282 1px solid"});
    $(this).find(".activeline").css("display","block");
    $(this).css({"border":"#7BF282 1px solid", "border-bottom":"none", "cursor":"default"});

    var id= $(this).attr("id");
    $(".info > div").css("display","none");
    $(".info .info_"+ id).css("display","block");
});


$(".file_data img").click(function(){
    $(this).parent().parent().find(".review_content").fadeToggle('slow','linear');
});