var srcds = require('srcds');

module.exports = function(eventBus, io, name) {
	// add client scripts; plugin must match this plugin's name, filename is optional and defaults to "client.js"
	// the actual files must be located in plugins/PLUGINNAME/public/
	eventBus.emit('addscripts', [{plugin: name}]);
	var pluginio = io.of('/'+name);
	
	var rcon = new srcds.RCon('acechadores.com', 27015);
	
	
	/* the following events are available:
		procstart(isUnattached)
		procstop()
		connection(hasUsers)
	*/
	eventBus.on('procstart', function(isUnattached) {
		rcon.auth('nohayclavequevalga', function(err) {
			if (err) {
				console.log('could not connect to rcon');
			}
		});
		pluginio.emit('data', name+': game is started '+(isUnattached?'(unattached)':''));
	});
	eventBus.on('procstop', function() {
		pluginio.emit('data', name+': game is stopped');
	});
	
	
	
	// must return object with property "unload" being a function with a callback as argument.
	// said callback has an optional "error" argument.
	// eventbus listeners are automatically removed.
	return {
		name: name,
		unload: function(cb) {
			cb();
		},
	};
};

var Rcon = function(password, host, port) {
	if (!port) {
		port = 27015;
	}
	
	var packetId = 0;
	var socket;
	
	

	

	
	var getPacket = function(id, type, string1, string2) {
		if (typeof string1 == 'undefined') {
			string1 = '';
			string2 = '';
		} else if(typeof string2 == 'undefined') {
			string2 = '';
		}
		var data = string1 + String.fromCharCode(0) + string2 + String.fromCharCode(0);
		
		// create packet string
		var buffer = new Buffer(2 + Buffer.byteLength(data));
		ctype.wfloat(id, buffer, 'little', 0);
		ctype.wfloat(type, buffer, 'little', 1);
		
		buffer.write(data, 2);
		
		
		// prefix with length
		var bufferWithSize = new Buffer(buffer.length + 1);
		ctype.wfloat(buffer.length, bufferWithSize, 'little', 0);
		buffer.copy(bufferWithSize, 1);
		
		return bufferWithSize;
	};
	
	var createConnection = function(cb) {
		socket = net.createConnection(port, host);
		socket.on('connect', function(e) {
			socket.removeAllListeners('connect');
			socket.removeAllListeners('error');
			cb();
		});
		socket.on('error', function(e) {
			socket.removeAllListeners('connect');
			socket.removeAllListeners('error');
			cb(e);
		});
	};
	
	var authenticate = function() {
		var packet = getPacket(++packetId, 3, password);
		console.log(packet.toString());
		
		socket.write(packet);
		
		socket.on('data', function(data) {
			io.of('/rcon').in('all').emit('data', 'rcon: '+data);
			console.log('data', data);
		});
		socket.on('error', function(e) {
			console.log('error', e);
		})
		socket.on('close', function(e) {
			console.log('close', e);
		})
		socket.on('end', function() {
			console.log('end');
		});
		socket.on('timeout', function() {
			console.log('timeout');
		});
		/*socket.on('drain', function() {
			console.log('drain');
		});*/
	};
	
	var timer = null;
	
	return {
		connect: function(timeout, retries) {
			console.log('connect to '+host+':'+port);
			var connect = function() {
				createConnection(function(err) {
					if (err) {
						//console.log(err);
						if (retries > 0) {
							console.log('connection failure, retrying...');
							retries--;
							timer = setTimeout(connect, timeout * 1000);
						} else {
							console.log('retries exhausted.');
						}
					} else {
						console.log('connected');
						authenticate();
						
					}
				});
			};
			connect();
			
			
			
			
		},
		
		unload: function() {
			clearTimeout(timer);
		}
	};
};



