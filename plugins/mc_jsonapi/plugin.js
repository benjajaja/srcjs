var JSONAPI = require('./jsonapi');
	
exports.load = function(eventBus, io, name) {
	var interval;
	var pluginio = io.of('/'+name);
	var json = JSONAPI(20060, 'minejson', 'morodebits', 'no me gusta el curry');
	
	// add client scripts; plugin must match this plugin's name, filename is optional and defaults to "client.js"
	// the actual files must be located in plugins/PLUGINNAME/public/
	eventBus.emit('addscripts', [{plugin: name}]);
	
	
	/* the following events are available:
		procstart (isUnattached)
		procstop ()
		userjoin ()
		userleave ()
	*/
	eventBus.on('procstart', function(isUnattached) {
		
		json.connect(5, 4, function(status) {
			if (status === true) {
				pluginio.emit('data', '[jsonapi] connected');
				
				json.on('error', function(message, error) {
					//console.log('jsonapi error "'+message+'"', error);
					pluginio.emit('error', message);
				});
				
				json.on('getPlayers', function(players) {
					pluginio.emit('players', players);
				});
				
				json.on('console', function(data) {
					pluginio.emit('console', data);
				});
				
				json.on('chat', function(data) {
					pluginio.emit('chat', data);
				});
				
				json.on('connection', function(data) {
					pluginio.emit('connection', data);
				});
				
				// get full playerlist in 5 minute interval
				interval = setInterval(function() {
					json.runMethod('getPlayers');
				}, 10000);
				setTimeout(function() {
					json.runMethod('getPlayers');	
				}, 1000);
				
				json.subscribe('console');
				json.subscribe('chat');
				json.subscribe('connections');
			}
		});
	});
	eventBus.on('procstop', function() {
		pluginio.emit('data', name+': game is stopped');
	});
	eventBus.on('userjoin', function(socket) {
		pluginio.emit('data', name+': User joined');
	});
	eventBus.on('userleave', function() {
		pluginio.emit('data', name+': User left');
	});

	eventBus.on('procstop', function() {
		pluginio.emit('data', name+': game is stopped');
	});
	
	
	pluginio.on('connection', function(socket) {
		socket.on('chat', function(data) {
			if (!json.runMethod('runConsoleCommand', ['say '+data])) {
				console.log('could not send chat command to socket');
			}
		});
	});
	
	// must return object with property "unload" being a function with a callback as argument.
	// said callback has an optional "error" argument.
	// eventbus listeners are automatically removed.
	// must remove all socket.io-namespace listeners (e. g. pluginio.removeAllListeners('connection') ... )
	return {
		name: name,
		unload: function(cb) {
			pluginio.removeAllListeners('connection');
			clearInterval(interval);
			json.unload();
			cb();
		},
	};
};