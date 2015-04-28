$(document).ready(function(){
	var current_tab = $('.nav-step.active > a');
	$('.nav.nav-3doers > li > a').mouseover( function(){
    var href = $(this).attr('href');
    $(current_tab.attr('href')).removeClass('active in');
    $(href).addClass('active in');
  });
  $('.nav.nav-3doers > li > a').mouseout( function(){
    var href = $(this).attr('href');
    $(href).removeClass('active in');
    $(current_tab.attr('href')).addClass('active in');
  });
});