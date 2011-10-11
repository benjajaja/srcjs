var http = require('http');
var JSONAPI = require('./jsonapi');
	
exports.load = function(eventBus, io, name) {
	var interval;
	var pluginio = io.of('/'+name);
	var json = JSONAPI(20060, 'minejson', 'morodebits', 'no me gusta el curry');
	
	// add client scripts; plugin must match this plugin's name, filename is optional and defaults to "client.js"
	// the actual files must be located in plugins/PLUGINNAME/public/
	eventBus.emit('addscripts', [{plugin: name}, {plugin: name, filename: 'minecraftskin.js'}]);
	
	var skinCache = {};
	var downloadSkin = function(url, response) {
		if (skinCache[url]) {
			response.write(skinCache[url], 'binary');
			response.end();
			
		} else {
			var options = {
				host: url.substring(0, url.indexOf('/')),
				port: 80,
				path: url.substring(url.indexOf('/')),
			}
			var req = http.request(options, function(res) {
				var cache = '';
				
				res.setEncoding('binary')
				
				if (res.statusCode == 200) {	
					res.on('data', function (chunk) {
						cache += chunk;
						response.write(chunk, 'binary');
						
					});
				}
				res.on('end', function () {
					if (res.statusCode == 200) {
						response.end();
						skinCache[url] = cache;
						// cache clear timeout:
						setTimeout(function() {
							delete skinCache[url];
						}, 10000);
						
					} else if (res.statusCode == 302) {
						var location = res.headers.location;
						if (location.indexOf('://') != -1) {
							location = location.substring(location.indexOf('://') + 3);
						}
						downloadSkin(location, response);
					} else {
						response.end();
					}
				});
			});
			req.on('error', function(e) {
				response.end(e.toString());
			});
			req.end();
			
		}
	};
	eventBus.emit('addroutes', [{
		plugin: name,
		path: 'skin/:skin',
		callback: function(req, res) {
			res.header('Content-Type', 'image/png');
			downloadSkin('www.minecraft.net/skin/'+req.params.skin+'.png', res);
		}
	}]);
	
	
	/* the following events are available:
		procstart (isUnattached)
		procstop ()
		userjoin ()
		userleave ()
	*/
	
	// TODO: make jsonDisconnect function, remove pluginio listeners
	var onJsonConnected = function(status) {
		if (status === true) {
			pluginio.emit('data', '[jsonapi] connected');
			
			json.on('error', function(message, error) {
				//console.log('jsonapi error "'+message+'"', error);
				pluginio.emit('error', message);
				console.log('json error:', message, error);
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
			
			// get full playerlist in an interval
			interval = setInterval(function() {
				json.runMethod('getPlayers');
			}, 10000);
			
			
			json.subscribe('console');
			json.subscribe('chat');
			json.subscribe('connections'); // doesn't fucking work
		}
	};
	
	eventBus.on('procstart', function(isUnattached) {
		if (userCount > 0) {
			console.log('connecting jsonapi due to proc start and some users');
			json.connect(5, 4, onJsonConnected);
		}
	});
	eventBus.on('procstop', function() {
		clearInterval(interval);
		json.unload();
	});
	var userCount = 0;
	eventBus.on('userjoin', function(socket) {
		userCount++;
		if (userCount === 1) {
			console.log('connecting jsonapi due to first user');
			json.connect(5, 4, onJsonConnected);
			setTimeout(function() {
				json.runMethod('getPlayers');	
			}, 1000);
		}
	});
	eventBus.on('userleave', function() {
		userCount--;
		if (userCount === 0) {
			console.log('unload jsonapi due to lack of users');
			clearInterval(interval);
			json.unload();
		}
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
		socket.on('console', function(data) {
			if (!json.runMethod('runConsoleCommand', [data])) {
				console.log('could not send console command to socket');
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