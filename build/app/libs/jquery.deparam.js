!function(deparam){if("function"==typeof require&&"object"==typeof exports&&"object"==typeof module){var jquery=require("jquery");module.exports=deparam(jquery)}else if("function"==typeof define&&define.amd)define(["jquery"],function(e){return deparam(e)});else{var global;try{global=eval("this")}catch(e){global=window}global.deparam=deparam(jQuery)}}(function(e){var t=function(e,t){var r={},o={true:!0,false:!1,null:null};return e.replace(/\+/g," ").split("&").forEach(function(e){var a,n=e.split("="),l=decodeURIComponent(n[0]),i=r,p=0,u=l.split("]["),d=u.length-1;if(/\[/.test(u[0])&&/\]$/.test(u[d])?(u[d]=u[d].replace(/\]$/,""),u=u.shift().split("[").concat(u),d=u.length-1):d=0,2===n.length)if(a=decodeURIComponent(n[1]),t&&(a=a&&!isNaN(a)&&+a+""===a?+a:"undefined"===a?void 0:void 0!==o[a]?o[a]:a),d)for(;p<=d;p++)l=""===u[p]?i.length:u[p],i=i[l]=p<d?i[l]||(u[p+1]&&isNaN(u[p+1])?{}:[]):a;else"[object Array]"===Object.prototype.toString.call(r[l])?r[l].push(a):!{}.hasOwnProperty.call(r,l)?r[l]=a:r[l]=[r[l],a];else l&&(r[l]=t?void 0:"")}),r};return e.prototype.deparam=e.deparam=t,t});