view.Resource = ul.bbext.View.extend({
    initialize: function () {
        this.page = this.options.page;
    },

    render: function () {
        var that = this,
            currentPage = this.page,
            currentPageName = currentPage.replace("/_resources/","");

        // Show the Footer
        $("#footer").removeClass("hide");

        $.get(currentPage)
            .done( function (html) {
                that.$el.html(html);
                $("a[href$='" + currentPageName + "']").parent("li").addClass("active").siblings().removeClass("active");
            })
            .fail( function () { UL.Router.error404(); } );

    }

});

