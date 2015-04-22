(function(){$(document).ready(function(){var e,t,n,a,r,i;return n=$("#registration"),i=new Validator(n,{"#address":{required:!0}}),n.on("error",function(e,t,n){return t.siblings(".help-block").remove(),t.parent().append($("<span>").addClass("help-block").text(n)),t.closest(".form-group").addClass("has-error")}),n.on("valid",function(e,t){return t.siblings(".help-block").remove(),t.closest(".form-group").removeClass("has-error")}),e=$("#address").bind("keypress",function(e){return 13===e.which?e.preventDefault():void 0}),e.val(""+address),a=new google.maps.places.Autocomplete(e.get(0)),google.maps.event.addListener(a,"place_changed",function(){var t,n,r,i,o,s,l,c;for(i=a.getPlace(),t=!1,r=!1,o=!1,c=i.address_components,s=0,l=c.length;l>s;s++)n=c[s],"locality"===n.types[0]&&(t=n.long_name),"country"===n.types[0]&&(r=n.long_name);return i.geometry&&i.geometry.location&&(o=[i.geometry.location.lng(),i.geometry.location.lat()]),t&&r&&o?($("#city").val(t),$("#country").val(r),$("#location").val(o)):(e.siblings(".help-block").remove(),e.parent().append($("<span>").addClass("help-block").text("Is not a valid address.")),e.closest(".form-group").addClass("has-error"))}),t="X-CSRF-Token",r=function(e){return jQuery.ajaxPrefilter(function(n,a,r){return r.crossDomain?void 0:r.setRequestHeader(t,e)})},r($('meta[name="csrf-token"]').attr("content")),$.ajaxUploadSettings.name="photo",$("#clickable").ajaxUploadPrompt({url:"/accounts/user/photo/upload",error:function(){var e;return e='<br><div class="alert alert-danger"><strong>Error</strong> uploading your file, please try again.</div>',$("#result").html(e)},success:function(){return location.reload()}}),$("a.remove-shipping-address").click(function(e){return e.preventDefault(),$.ajax({url:$(this).attr("href"),method:"post",success:function(){return window.location.reload()},statusCode:{400:function(e){return alert(e.msg),location.reload(!0)}}})})})}).call(this);