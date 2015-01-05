// NiceSelect Plugin
(function ($) {
 
    $.fn.niceSelect = function(options) {
 
        var pluginName = "niceSelect",
            defaults   = {
                layout : "inline" // default layout
            };
     
        return this.each(function() {
          
            var _self     = $(this),
                wrapperTmpl = ["<div class=nice-select-wrapper>","</div>"].join(""),
                labelRoot   = $(this).attr("aria-label"),
                labelValue  = $(this).find('option:selected').text(),
                labelTmpl   = ["<label class=nice-label>",
                                "<span class=root>",
                                labelRoot,
                                "</span>",
                                "<span class=value>",
                                labelValue,
                                "</span>",
                                "</label>"].join("");
  
            _self.wrap(wrapperTmpl);
            _self.before(labelTmpl);
            
            _self.change(function(){
                _self.parent().find(".value").text(_self.find("option:selected").text());
            });

            // $(document).on("DOMNodeInserted", function(e){
            //     var $el = $(event.target);
            //     if ($el.hasClass(_self.attr("class"))) {
            //         $el.niceSelect();
            //     }
            // });

 
        });

    };

})(jQuery);