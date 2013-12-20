(function($) {

    // Proxy the original Backbone.View setElement method:
    // See: http://backbonejs.org/#View-setElement

    var backboneSetElementOriginal = Backbone.View.prototype.setElement;

    Backbone.View.prototype.setElement = function(element) {
        if (this.el != element) {
            $(this.el).backboneView('unlink');
        }

        $(element).backboneView(this);

        return backboneSetElementOriginal.apply(this, arguments);
    };

    // Create a custom selector to search for the presence of a 'backboneView' data entry:
    // This avoids a dependency on a data selector plugin...

    $.expr[':'].backboneView = function(element, intStackIndex, arrProperties, arrNodeStack) {
        return $(element).data('backboneView') !== undefined;
    };

    // Plugin internal functions:

    var registerViewToElement = function($el, view) {
        $el.data('backboneView', view);
    };

    var getClosestViewFromElement = function($el, viewType) {
        var ret = null;

        viewType = viewType || Backbone.View;

        while ($el.length) {
            $el = $el.closest(':backboneView');
            ret = $el.length ? $el.data('backboneView') : null;

            if (ret instanceof viewType) {
                break;
            }
            else {
                $el = $el.parent();
            }
        }

        return ret;
    };

    // Extra methods:

    var methods = {

        unlink: function($el) {
            $el.removeData('backboneView');
        }

    };

    // Plugin:

    $.fn.backboneView = function() {
        var ret = this;
        var args = Array.prototype.slice.call(arguments, 0);

        if ($.isFunction(methods[args[0]])) {
            methods[args[0]](this);
        }
        else if (args[0] && args[0] instanceof Backbone.View) {
            registerViewToElement(this.first(), args[0]);
        }
        else {
            ret = getClosestViewFromElement(this.first(), args[0]);
        }

        return ret;
    }

})(jQuery);
