// please use srcjs.plugins.PLUGINNAME as your namespace
// implement onStatus(status) to be notified of start/stop status

srcjs.plugins.srcrcon = (function() {

	// connect to private socket.io channel
	var rconio = io.connect('/rcon');
	
	rconio.on('data', function(data) {
		panel.val(panel.val() + '\n' + data);
	});

	// let's add a tab
	var panel = $('<textarea cols="50" rows="20"/>');
	srcjs.addTab('RCON', panel);
	
	// MUST return object with property onStatus: function(status) and onUnload: function()
	return {
		onStatus: function(status) {
			panel.val('srcrcon plugin notified of status "'+status+'" on client side');
		},
		onUnload: function() {
			// cleanup
		}
	}
})();