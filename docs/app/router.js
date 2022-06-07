define(["jquery","underscore","backbone","jquery.deparam","components/app/AppView","components/app/AppModel"],function(e,o,t,r,n,i){var u={},a=t.Router.extend({routes:{"(/)":"root","!(/)":"root","!/page(/*path)":"page","!/db(/*path)":"db"},resetApp:function(){this.navigate("",{trigger:!0})},goHome:function(){this.navigate("!/db",{trigger:!0,replace:!0})},goToFragment:function(e){this.navigate(e,{trigger:!0})},queryAllow:function(e){this.queryDelete(o.difference(o.keys(u.model.getQuery()),e),!0,!0)},queryDelete:function(e,t,r){t=void 0===t||t,r=void 0!==r&&r;var n=o.clone(u.model.getQuery());"string"==typeof e?delete n[e]:o.each(e,function(e){delete n[e]}),this.update({query:n,trigger:t,replace:r})},queryUpdate:function(e,t,r,n){return t=void 0===t||t,r=void 0!==r&&r,n=void 0===n||n,e=n?o.extend({},u.model.getQuery(),e):e,this.update({query:e,trigger:t,replace:r}),e},queryToggle:function(e,t){t=void 0===t||t;var r=o.clone(u.model.getQuery());return"object"==typeof e?o.each(e,function(e,t){o.contains(o.keys(r),t)&&r[t]===e?delete r[t]:r[t]=e},this):o.contains(o.keys(r),e)?delete r[e]:r[e]="true",t&&this.update({query:r}),r},update:function(t){var r=void 0===t.trigger||t.trigger,n=void 0!==t.replace&&t.replace,i=void 0!==t.extendQuery&&t.extendQuery,a=void 0!==t.route?t.route:u.model.getRoute();a=""!==a?"/"+a:"";var l=void 0!==t.path?t.path:""!==u.model.getPath()?u.model.getPath():"";l=""!==l?"/"+l:"";var d=void 0!==t.query?i?o.extend({},u.model.getQuery(),t.query):t.query:u.model.getQuery();o.each(o.clone(d),function(e,o){(!e.length||1===e.length&&""===e[0]||"^^^@]"===e)&&delete d[o]}),d=e.param(d),d=""!==d?"?"+d:"",this.navigate("!"+a+l+d,{trigger:r,replace:n})},goBack:function(){window.history.back()}});return{initialize:function(r){u.Router=new a;var l=r.config_file,d=window.location.pathname,c=d.replace(/\/$/,"").replace(/^\//,"").split("/");c[0],c.length>1&&c[1],void 0===window.location.origin&&(window.location.origin=window.location.protocol+"//"+window.location.hostname+(window.location.port?":"+window.location.port:"")),u.model=u.model||new i({views:{},configFile:l,baseurl:window.location.origin+window.location.pathname,router:u.Router,route:{route:"",path:"",query:{}}}),u.Router.on("route:root",function(){this.navigate("!/db",{trigger:!0,replace:!0})}),u.Router.on("route:db",function(t,r){t=null!==t&&void 0!==t?t:"",r=null!==r&&void 0!==r?e.deparam(r):{},void 0===r.out||null===r.out||""===r.out||void 0===r.maprecords||null===r.maprecords||""===r.maprecords||void 0===r.mapsources||null===r.mapsources||""===r.mapsources||void 0===r.map||null===r.map||""===r.map||void 0===r.colorby||null===r.colorby||""===r.colorby||void 0===r.sourcecolorby||null===r.sourcecolorby||""===r.sourcecolorby?(void 0!==r.out&&null!==r.out&&""!==r.out||o.extend(r,{out:"map"}),void 0!==r.map&&null!==r.map&&""!==r.map||o.extend(r,{map:"control"}),void 0!==r.maprecords&&null!==r.maprecords&&""!==r.maprecords||o.extend(r,{maprecords:"1"}),void 0!==r.mapsources&&null!==r.mapsources&&""!==r.mapsources||o.extend(r,{mapsources:"1"}),void 0!==r.colorby&&null!==r.colorby&&""!==r.colorby||o.extend(r,{colorby:"validity"}),void 0!==r.sourcecolorby&&null!==r.sourcecolorby&&""!==r.sourcecolorby||o.extend(r,{sourcecolorby:"source_class"}),this.update({route:"db",path:t,query:r,extendQuery:!1,trigger:!0,replace:!0})):(u.model.setRoute({route:"db",path:t,query:r}),void 0===u.view&&(u.view=new n({model:u.model})))}),u.Router.on("route:page",function(o,t){o=null!==o&&void 0!==o?o:"",t=null!==t&&void 0!==t?e.deparam(t):{},""===o?this.update({route:"db",path:"",query:t,extendQuery:!0,trigger:!0,replace:!0}):(u.model.setRoute({route:"page",path:o,query:t}),void 0===u.view&&(u.view=new n({model:u.model})))}),t.history.start()}}});