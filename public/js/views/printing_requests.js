(function(){$(document).ready(function(){var t,e;return t="X-CSRF-Token",e=function(e){return jQuery.ajaxPrefilter(function(n,a,r){return r.crossDomain?void 0:r.setRequestHeader(t,e)})},e($('meta[name="csrf-token"]').attr("content")),$(".info_jobs_available").last().find(".separator").css("display","none"),$(".info > div").css("display","block"),$("a.btn-3doers-new.review").click(function(t){return t.preventDefault(),$.ajax({url:$(this).attr("href"),method:"post",dataType:"json",success:function(t){return alert(t.msg),window.location.href="/printing/jobs"},statusCode:{400:function(t){return alert(t.msg),location.reload(!0)}}})})})}).call(this);