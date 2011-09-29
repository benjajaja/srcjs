module.exports = function(eventBus, io, name) {
	
	eventBus.emit('addscripts', [{plugin: name}]);
	
	eventBus.on('start', function(isUnattached) {
		console.log('SRCRCON: game is started '+(isUnattached?'(unattached)':''));
	});
	eventBus.on('stop', function() {
		console.log('SRCRCON: game is stopped');
	});
	eventBus.on('userjoin', function(socket) {
		console.log('SRCRCON: User joined');
	});
	eventBus.on('userleave', function() {
		console.log('SRCRCON: User left');
	});
	
	io.of('/rcon').on('connection', function(socket) {
		socket.emit('data', 'test');
	});
};