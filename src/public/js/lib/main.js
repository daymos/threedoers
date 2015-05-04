function openPopup() {
  var width  = 575,
      height = 400,
      left   = ($(window).width()  - width)  / 2,
      top    = ($(window).height() - height) / 2,
      url    = this.href,
      opts   = 'status=1' +
               ',width='  + width  +
               ',height=' + height +
               ',top='    + top    +
               ',left='   + left;

    window.open(url, $(this).data('title'), opts);

    return false;
};

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

  $('.social-popup').click(openPopup);
});
