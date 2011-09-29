// please use srcjs.plugins.PLUGINNAME as your namespace
// implement onStatus(status) to be notified of start/stop status

srcjs.plugins.srcrcon = (function() {

	var rconio = io.connect('/rcon');
	
	rconio.on('data', function(data) {
		panel.val('rcon data: '+data);
	});

	var panel = $('<textarea/>');
	srcjs.addTab('RCON', panel);
	
	return {
		onStatus: function(status) {
			panel.val('srcrcon plugin notified of status "'+status+'"');
		}
	}
})();