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
