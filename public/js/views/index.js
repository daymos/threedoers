(function(){$(document).ready(function(){var e,t;return e="X-CSRF-Token",t=function(t){return jQuery.ajaxPrefilter(function(n,r,i){return i.crossDomain?void 0:i.setRequestHeader(e,t)})},t($('meta[name="csrf-token"]').attr("content")),$.ajaxUploadSettings.name="thumbnail",$("#manager-clickable").ajaxUploadPrompt({url:"/filemanager/upload",error:function(){return alert("error uploading file")},success:function(e){var t,n,r;if(e.errors){r=[];for(t in object)n=object[t],r.push(alert(""+t+": "+n));return r}return location.href=e.redirectTo}})})}).call(this);