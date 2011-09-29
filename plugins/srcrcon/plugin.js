module.exports = function(eventBus, io, name) {
	
	// add client scripts; plugin must match this plugin's name, filename is optional and defaults to "client.js"
	// the actual files must be located in plugins/PLUGINNAME/public/
	eventBus.emit('addscripts', [{plugin: name}]);
	
	/* the following events are available:
		procstart(isUnattached)
		procstop()
		userjoin()
		userleave()
	*/
	eventBus.on('procstart', function(isUnattached) {
		io.of('/rcon').in('all').emit('data', name+': game is started '+(isUnattached?'(unattached)':''));
	});
	eventBus.on('procstop', function() {
		io.of('/rcon').in('all').emit('data', name+': game is stopped');
	});
	eventBus.on('userjoin', function(socket) {
		io.of('/rcon').in('all').emit('data', name+': User joined');
	});
	eventBus.on('userleave', function() {
		io.of('/rcon').in('all').emit('data', name+': User left');
	});
	
	// plugins should only use their private socket.io channel
	io.of('/rcon').on('connection', function(socket) {
		socket.join('all');
	});
	
	// must return object with property "unload" being a function with a callback as argument.
	// said callback has an optional "error" argument.
	// eventbus listeners are automatically removed.
	return {
		name: name,
		unload: function(cb) {
			//io.of('/rcon').removeAllListeners('connection');
			cb();
		},
	};
};