/**
 * Copyright (c) 2009, Nathan Bubna
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 * This plugin is an effort to combine jQuery simplicity with some
 * JSON-REST principles and add some nice convenience features.
 *
 * Here's the basic ideas:
 *  - Maps CRUD calls ($.Create, $.Read, $.Update and $.Delete) to http methods
 *    (POST, GET, PUT and DELETE) via jQuery.ajax() calls.
 *  - Defaults everything to JSON dataType (works best with JSON utils present, in which
 *    case it will process the data into json instead of a query string for calls to
 *    Create and Update).
 *  - Tries to move data into the provided URL, such that
 *    $.Read("/{b}/{a}", { a:'foo', b:'bar', c:3 }) ultimately becomes a 
 *    GET to "/bar/foo?c=3"..
 *  - Allows you to pass in the usual success (and error) callback,
 *    but also "before", "after" and error status-code callbacks.
 *  - Makes it easy to add handler functions for specific error status codes. Just
 *    add them to your options argument with the code as the key
 *    (e.g. { ..., 404: function(xhr, status, opts) { ... }, ... }) or even treat
 *    such status codes as successful (e.g. { 404: 'success', ... }).
 *  - Uses Values plugin when called on a jQuery selection (e.g. $('#foo').Read(...))
 *    to get data and set the JSON response (by default, if Values is present).
 *
 * The before and after callbacks will be called when the XHR response
 * is ready, regardless of whether it succeeded or failed or even whether
 * you have provided a success, error or status code callback at all.
 * Think of them as "finally" clauses, one before and one after the primary
 * callback for that request status, if any.  These receive the same arguments
 * as the primary callback.  So, for instance, any 'after' callback you
 * provide is different from a 'complete' one in that it receives the data
 * as the first argument if the request succeeded or the XHR if it failed and
 * it receives the options for the call as the third arg, unlike 'complete'
 * which always only receives the xhr and the status string. It should also be
 * noted here that the options object always receives the XHR object as a 'xhr
 * property once created, to ensure it is always available to all callbacks that way.
 *
 * When one of the CRUD functions is called on an element(s) with no other
 * data provided (and getValues still set to true), this simply calls
 * this.values(options) to get the data to use.  Then, assuming the call
 * succeeded (and setValues is still true), this also uses Values to set
 * the result back to the element (e.g. this.values(res, options)).
 * This setting of the result happens in between the "before" callback (if any)
 * and the "success" callback (if any).
 *
 * All function calls (global or per-element) accept four parameters:
 *   url: the url to be filled and requested (required)
 *   data:  data object whose properties are to be filled into the url and then
 *          either appended as request parameters or stringified into the request
 *          body (if JSON is available and it's an Update call). (optional)
 *   success: callback to be executed once the JSON response
 *            is ready and successfully parsed (optional)
 *   options: object containing options to be used (e.g. other jQuery.ajax
 *            options, other jQuery.values options, before/after/error/etc callbacks,
 *            getValues, setValues, etc). (optional)
 * These are the legitimate combinations for using these params (using
 * the various functions as examples, though all argument combinations
 * work for all these provided functions):
 *
 *             $.Read(url);
 *     $('#foo').Read(options);
 *   $('.foo').Delete(url, data);
 *           $.Update(url, data, options);
 *           $.Delete(url, success);
 *   $('#foo').Create(url, success, options);
 *             $.Read(url, data, success);
 *           $.Create(url, data, success, options);
 *
 * Note that the url is never optional, if you only pass in options, that object
 * must have a url property.  It also never works to put the options as the second
 * parameter, as this does not distinguish between a data object and an options object.
 *
 * If you are working with a backend that does not properly handle PUT or DELETE http
 * methods, adapt for this by calling:
 *
 *   $.rest.useGetAndPost();
 *
 * Data can also be set globally by setting a data object to $.rest.data.  This will
 * be used as data for every subsequent call to any CRUD function.  Any global data will
 * be overridden by call data with the same property name, of course.  This global data
 * will also be used for calls to $.rest.fillUrl(url) that have no data argument.
 *
 * Also, if all your URLs begin with the same prefix, you can set that like so:
 *
 *  $.rest.prefix = "/myservice/";
 *
 * and it will automatically be prepended to all your URLs.
 *
 * @version 1.0.3
 * @name rest
 * @cat Plugins/Rest
 * @author Nathan Bubna
 */
(function ($) {

    var R = $.rest = {
        version: "1.0.3",
        useGetAndPost: function() {
            R.Create.type = R.Delete.type = R.Update.type = "POST";
            R.Read.type = "GET";
        },
        // general options
        options: {
            dataType: "rest", // altered $.ajax default
            onlyNest: true, // altered $.values default
            // on-element options
            setValues: true,
            getValues: true
        },
        // CRUD-specific options
        Create: { type: "POST",   process: true  },
        Read:   { type: "GET",    process: false },
        Update: { type: "PUT",    process: true  },
        Delete: { type: "DELETE", process: false,
                  onElement: function() { this.remove(); } },
        // global data
        data: null,

        toOpts: function(url, data, success, opts) {
            if (arguments.length == 1 && typeof url == "object") {
                opts = url;
                url = null;
            } else {
                if (!$.isFunction(success)) {
                    opts = success;
                    success = null;
                }
                if ($.isFunction(data)) {
                    success = data;
                    data = null;
                }
            }
            var o = $.extend({}, R.options, opts);
            if (this.jquery) o.target = this;
            else $.extend(o, R[this]);
            if (url) o.url = url;
            if (success) o.success = success;
            if (data) o.data = data;
            return o;        
        },
        fillUrl: function(url, data, safe) {
            if (!data) data = $.extend({}, R.data);
            if (safe) data = $.extend({}, data);
            var key, u, val;
            for (key in data) {
                val = data[key];
                u = url.replace('{'+key+'}', val);
                if (u != url) {
                    url = u;
                    delete data[key];
                }
            }
            return url;
        },
        prep: function() {
            var act = R[this], o = R.toOpts.apply(this, arguments);
            // don't alter the original data
            if (o.data || R.data) o.data = $.extend({}, R.data, o.data);
            o.url = R.fillUrl(o.url, o.data);
            if (R.prefix) o.url = R.prefix + o.url;
            o.success = R.wrap(o.success, o.before, o.after, o.dataType, o);
            o.error = R.handle(o.error, o);
            if (o.process && JSON) R.processOut(o);
            return o;
        },
        handle: function(error, o) {
            return function(xhr, status) {
                var fn = o[xhr.status] || error;
                if (fn != error) {
                    o.handled = true;
                    if (fn == 'success') return o.success(null, status);
                }
                R.wrap(fn, o.before, o.after, o)(xhr, status);
            };
        },
        wrap: function(callback, before, after, type, opts) {
            return function() {
                var t = this, a = Array.prototype.slice.call(arguments);
                a[a.length] = opts;
                if (type == 'rest') a[0] = R.processIn.apply(t, a);
                if (before) before.apply(t, a);
                if (callback) callback.apply(t, a);
                if (after) after.apply(t, a);
            };
        },
        processOut: function(o) {
            o.processData = false; // tell jQuery not to process
            if (!o.contentType) o.contentType = "application/json";
            if (typeof o.data != "string") {
                o.data = JSON.stringify(o.data || {});
            }
        },
        processIn: function(str) {
            if ((str || '').length == 0) return null;
            if (str.charAt(0) == '<') return $(str);
            return JSON ? JSON.parse(str) : window.eval("("+str+")");
        },
        element: function(act, o) {
            if (!o.data && o.getValues && $.values) {
                o.data = this.values(o);
            }
            var self = this, success = o.success;
            o.success = function(data) {
                if (data && o.setValues && $.values) self.values(data, o);
                if (success) success.apply(this, arguments);
                if (o.onElement) o.onElement.apply(this, arguments);
            };
            $[act](o);
        },
        ajax: function(o) {
            return o.xhr = $.ajax(o);
        }
    };

    // create the global and element level functions for each action
    $.each(['Create','Read','Update','Delete'], function(i, act) {
        $[act] = function() {
            return R.ajax(R.prep.apply(act, arguments));
        };
        $.fn[act] = function() {
            var a = arguments;
            return this.each(function() {
                var t = $(this);
                R.element.call(t, act, R.toOpts.apply(t, a));
            });
        };
    });

})(jQuery);


