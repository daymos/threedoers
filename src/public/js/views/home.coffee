toggle = ->
  $(".myprofileitem").fadeToggle "slow", "linear"
  return
$(document).ready ->
  $("#bxslider").bxSlider auto: true
  $(".info_projects").last().find(".separator").css "display", "none"
  $(".info_archived").last().find(".separator").css "display", "none"
  $(".info_jobs_available").last().find(".separator").css "display", "none"
  return

$(".flange ul li").click ->
  $(".flange ul li .activeline").css "display", "none"
  $(".flange ul li").css
    border: "none"
    "border-bottom": "#7BF282 1px solid"

  $(this).find(".activeline").css "display", "block"
  $(this).css
    border: "#7BF282 1px solid"
    "border-bottom": "none"
    cursor: "default"

  id = $(this).attr("id")
  $(".info > div").css "display", "none"
  $(".info .info_" + id).css "display", "block"
  return

$(".file_data img").click ->
  $(this).parent().parent().find(".review_content").fadeToggle "slow", "linear"
  return
