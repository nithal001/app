require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function() {

    'use strict';

    var API = {};

    //Common carousel auto slide false
    API.widgetNewsShow = function() {
      if(!$('.widgets__news').length) return;

      var elem = $('.widgets__news li');

      var toggle = false;

      if(elem.length > 4){
        elem.slice(4).hide();
      }

      $('.showmore').on('click', function(ev){
        ev.preventDefault();

        if(toggle = !toggle){

          elem.show('slow', function(){
            // $("html, body, #s4-workspace").stop().animate({ scrollTop: $('body, html, #s4-workspace').height() - 800 });
          });

          $('.showmore').text('Show less');

        }else{
          elem.slice(4).hide('slow');
          $('.showmore').text('Show more');
        }

      })
    };

    return API;

};

},{}],"UfldiY":[function(require,module,exports){
var common = require('./common')();
$(function(){
  common.widgetNewsShow();
});

$(window).on('load', function(){

});

},{"./common":1}],"main":[function(require,module,exports){
module.exports=require('UfldiY');
},{}]},{},["UfldiY"])


//# sourceMappingURL=script.js.map