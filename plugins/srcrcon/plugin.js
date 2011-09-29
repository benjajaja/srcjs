module.exports = function(eventBus, io, name) {
	
	// add client scripts; plugin must match this plugin's name, filename is optional and defaults to "client.js"
	// the actual files must be located in plugins/PLUGINNAME/public/
	eventBus.emit('addscripts', [{plugin: name}]);
	
	/* the following events are available:
		process related:
			start(isUnattached)
			stop()
		website user:
			userjoin()
			userleave()
	*/
	eventBus.on('start', function(isUnattached) {
		console.log(name+': game is started '+(isUnattached?'(unattached)':''));
	});
	eventBus.on('stop', function() {
		console.log(name+': game is stopped');
	});
	eventBus.on('userjoin', function(socket) {
		console.log(name+': User joined');
	});
	eventBus.on('userleave', function() {
		console.log(name+': User left');
	});
	
	// plugins should only use their private socket.io channel
	io.of('/rcon').on('connection', function(socket) {
		socket.emit('data', name+': test');
	});
};