/*! Select2 4.0.3 | https://github.com/select2/select2/blob/master/LICENSE.md */

!function(){if(jQuery&&jQuery.fn&&jQuery.fn.select2&&jQuery.fn.select2.amd)var e=jQuery.fn.select2.amd;e.define("select2/i18n/et",[],function(){return{inputTooLong:function(e){var n=e.input.length-e.maximum,u="Sisesta "+n+" täht";return 1!=n&&(u+="e"),u+=" vähem"},inputTooShort:function(e){var n=e.minimum-e.input.length,u="Sisesta "+n+" täht";return 1!=n&&(u+="e"),u+=" rohkem"},loadingMore:function(){return"Laen tulemusi…"},maximumSelected:function(e){var n="Saad vaid "+e.maximum+" tulemus";return 1==e.maximum?n+="e":n+="t",n+=" valida"},noResults:function(){return"Tulemused puuduvad"},searching:function(){return"Otsin…"}}}),e.define,e.require}();