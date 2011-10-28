// please use srcjs.plugins.PLUGINNAME as your namespace

/* This function is executed inmediately. We do this to isolate the scope.
 * We must return at least an empty object, if we want to load other scripts
 * and add them to our namespace.
 */
srcjs.plugins.sample = (function() {
	
	// connect to private socket.io channel
	var pluginio = io.connect('/sample');
	
	// panel should almost definitely be srcjs.ui.TabPanel
	var panel = srcjs.ui.TabPanel({plugin: 'sample'});
	
	/**
	 * Whatever you put into the panel is your choice.
	 * You may use some of the srcjs.ui.* stuff to get a consistent look,
	 * use jquery.ui which is already included, or do whatever you want.
	 */
	var box = srcjs.ui.Box({title: 'A sample plugin'});
	panel.append(box.panel);
	
	// let's communicate something useless, in all eternity!
	setInterval(function() {
		pluginio.emit('myclientevent', {anObject: 'tuuut tuuuut'});
	}, 10000);
	pluginio.emit('myclientevent', {anObject: '¿qué habeis comío?'});
	
	// let's react to socket.io events from our plugin
	pluginio.on('myserverevent', function(data) {
		box.append($('<span/>').text(data.property));
	});
	
	// we must add our self to the tab list if we have an UI
	srcjs.addTab('Sample plugin', panel);
	
	// notice that we also ordered to load "additional.js"
	return {};
})();