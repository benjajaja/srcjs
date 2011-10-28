/**
 * This is just an example on how to split your plugin across several files.
 * Additional client side scripts are guaranteed to load sequentially in the order
 * you specified in the "addscripts" event.
 * See how we add another level to our namespace:
 */
srcjs.plugins.sample.additional = (function() {
	if (typeof console != 'undefined') {
		console.log('"additional.js" loaded');
	}
	// ...
	return {
	};
})();