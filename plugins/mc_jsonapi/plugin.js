var JSONAPI = require('./jsonapi');
var downloadMinecraftSkin = require('./minecraftskin');
	
module.exports = function(eventBus, io, config, name) {
	config = config || {};
	config.hostname = typeof config.hostname != 'undefined' ? config.hostname : 20060;
	config.port = typeof config.port != 'undefined' ? config.port : 20060;
	config.username = typeof config.username != 'undefined' ? config.username : 'usernameGoesHere';
	config.password = typeof config.password != 'undefined' ? config.password : 'passwordGoesHere';
	config.salt = typeof config.salt != 'undefined' ? config.salt : 'salt goes here';
	
	var interval, intvalMemory;
	var pluginio = io.of('/'+name);
	var json = JSONAPI(config.host, config.port, config.username, config.password, config.salt);
	var memoryTotal = 0;
	
	// add client scripts; plugin must match this plugin's name, filename is optional and defaults to "client.js"
	// the actual files must be located in plugins/PLUGINNAME/public/
	eventBus.emit('addscripts', [
		{plugin: name},
		{plugin: name, filename: 'minecraftskin.js'},
		{plugin: name, filename: 'playerview.js'}
	], name);
	
	
	eventBus.emit('addroutes', [{
		plugin: name,
		path: 'skin/:skin',
		callback: function(req, res) {
			res.header('Content-Type', 'image/png');
			downloadMinecraftSkin('www.minecraft.net/skin/'+req.params.skin+'.png', res, console.log);
		}
	}], name);
	
	
	/* the following events are available:
		procstart (isUnattached)
		procstop ()
		connection (hasUsers)
	*/
	
	// TODO: make jsonDisconnect function, remove pluginio listeners
	var onJsonConnected = function(status) {
		if (status === true) {
			pluginio.emit('data', '[jsonapi] connected');
			
			json.on('error', function(message, error) {
				//console.log('jsonapi error "'+message+'"', error);
				pluginio.emit('error', message);
				console.error('json error: '+message);
				console.error(error.message);
				console.error(error);
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
			
			json.on('connections', function(data) {
				pluginio.emit('connections', data);
			});
			
			json.on('lagmeter', function(data) {
				pluginio.emit('lagmeter', data);
			});
			
			json.on('system.getJavaMemoryTotal', function(data) {
				memoryTotal = data;
				pluginio.emit('loadgraph', {'javaMemoryTotal': data});
				
				
			});
			
			json.on('system.getJavaMemoryUsage', function(data) {
				if (memoryTotal > 0) {
					pluginio.emit('loadgraph', Math.floor(100 * data / memoryTotal));
				}
			});
			
			json.on('getPlugins', function(plugins) {
				pluginio.emit('plugins', plugins);
			});
			
			json.on('getServer', function(server) {
				pluginio.emit('server', server);
			});
			
			// get full playerlist in an interval
			var pollInfo = function() {
				json.runMethod('getPlugins');
				json.runMethod('getServer');
				json.runMethod('system.getJavaMemoryUsage');
			};
			pollInfo();
			interval = setInterval(pollInfo, 10000);
			
			json.subscribe('console');
			json.subscribe('chat');
			json.subscribe('connections'); // doesn't fucking work
			json.subscribe('lagmeter');
			
			json.runMethod('system.getJavaMemoryTotal');
		} else {
			pluginio.emit('error', 'cannot connect to jsonapi');
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
		clearInterval(intvalMemory);
		json.unload();
	});
	var userCount = 0;
	eventBus.on('users', function(hasUsers) {
		if (hasUsers) {
			console.log('connecting jsonapi due to first user');
			json.connect(5, 4, onJsonConnected);
			
		} else {
			console.log('unload jsonapi due to lack of users');
			clearInterval(interval);
			clearInterval(intvalMemory);
			pluginio.removeAllListeners('player.getInventory');
			json.unload();
		}
	});
	
	eventBus.on('userjoin', function() {
		json.runMethod('getPlugins');
		json.runMethod('getServer');
	});
	
	pluginio.on('connection', function(socket) {
		socket.on('chat', function(data) {
			if (!json.runMethod('broadcastWithName', [data, 'node.js'])) {
				console.log('could not send chat command to socket');
			}
		});
		socket.on('console', function(data) {
			if (!json.runMethod('runConsoleCommand', [data])) {
				console.log('could not send console command to socket');
			}
		});
		
		socket.on('command', function(data, callback) {
			console.log('jsonapi command:', data);
			json.once(data.command, function(data) {
				callback(null, data);
			});
			if (!json.runMethod(data.command, data.args)) {
				callback('could not run jsonapi command');
			} else {
				
			}
		})
		
		socket.on('getPlayer', function(player, callback) {
			json.runMethod('getPlayer', [player]);
			var onJsonPlayer = function(data) {
				callback(data);
				json.removeListener('getPlayer', onJsonPlayer);
			};
			json.on('getPlayer', onJsonPlayer);
		});
		
		socket.on('pluginSetEnabled', function(data, callback) {
			if (data.enabled) {
				json.runMethod('enablePlugin', [data.plugin]);
				var onJsonResponse = function(enabled) {
					callback(enabled);
					json.removeListener('enablePlugin', onJsonResponse);
				};
				json.on('enablePlugin', onJsonResponse);
			} else {
				json.runMethod('disablePlugin', [data.plugin]);
				var onJsonResponse = function(disabled) {
					callback(disabled);
					json.removeListener('disablePlugin', onJsonResponse);
				};
				json.on('disablePlugin', onJsonResponse);
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
			clearInterval(intvalMemory);
			json.unload();
			cb();
		},
	};
};