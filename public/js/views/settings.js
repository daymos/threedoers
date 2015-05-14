(function(){$(document).ready(function(){var t,e,n,i,r,o;return n=$("#registration"),o=new Validator(n,{"#address":{required:!0}}),n.on("error",function(t,e,n){return e.siblings(".help-block").remove(),e.parent().append($("<span>").addClass("help-block").text(n)),e.closest(".form-group").addClass("has-error")}),n.on("valid",function(t,e){return e.siblings(".help-block").remove(),e.closest(".form-group").removeClass("has-error")}),t=$("#address").bind("keypress",function(t){return 13===t.which?t.preventDefault():void 0}),t.val(""+address),i=new google.maps.places.Autocomplete(t.get(0)),google.maps.event.addListener(i,"place_changed",function(){var e,n,r,o,a,s,l,c;for(o=i.getPlace(),e=!1,r=!1,a=!1,c=o.address_components,s=0,l=c.length;l>s;s++)n=c[s],"locality"===n.types[0]&&(e=n.long_name),"country"===n.types[0]&&(r=n.long_name);return o.geometry&&o.geometry.location&&(a=[o.geometry.location.lng(),o.geometry.location.lat()]),e&&r&&a?($("#city").val(e),$("#country").val(r),$("#location").val(a)):(t.siblings(".help-block").remove(),t.parent().append($("<span>").addClass("help-block").text("Is not a valid address.")),t.closest(".form-group").addClass("has-error"))}),e="X-CSRF-Token",r=function(t){return jQuery.ajaxPrefilter(function(n,i,r){return r.crossDomain?void 0:r.setRequestHeader(e,t)})},r($('meta[name="csrf-token"]').attr("content")),$.ajaxUploadSettings.name="photo",$("#clickable").ajaxUploadPrompt({url:"/accounts/user/photo/upload",error:function(){var t;return t='<br><div class="alert alert-danger"><strong>Error</strong> uploading your file, please try again.</div>',$("#result").html(t)},success:function(){return location.reload()}}),$("a.remove-shipping-address").click(function(t){return t.preventDefault(),$.ajax({url:$(this).attr("href"),method:"post",success:function(){return window.location.reload()},statusCode:{400:function(t){return alert(t.msg),location.reload(!0)}}})}),$("a.activate-shipping-address").click(function(t){return t.preventDefault(),$.ajax({url:$(this).attr("href"),method:"post",success:function(){return window.location.reload()},statusCode:{400:function(t){return alert(t.msg),location.reload(!0)}}})})})}).call(this);