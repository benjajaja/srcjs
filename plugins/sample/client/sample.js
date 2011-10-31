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
	
	var content = $('<div class="srcjsPanelBody"/>');
	box.append(content);
	
	var textarea = $('<textarea/>').css({display: 'block'});
	content.append($('<button/>').text('Send "Is anybody there?" to plugin backend').click(function() {
		pluginio.emit('myclientevent', {message: "Is anybody there?"});
	}));
	content.append(textarea);
	
	// let's react to socket.io events from our plugin
	pluginio.on('myserverevent', function(data) {
		textarea.val(data.message);
	});
	
	// we must add our self to the tab list if we have an UI
	srcjs.addTab('Sample plugin', panel);
	
	// notice that we also ordered to load "additional.js"
	return {};
})();