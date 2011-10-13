var fs = require('fs');

var plugins = [];

var loadPlugin = function(eventBus, io, name, cb) {
	fs.stat('./plugins/'+name, function(err, stat) {
		if (err) {
			console.error('plugin "'+name+'" not found');
		} else if (stat.isDirectory()) {
			try {
				// load module and clear cache inmediately to be able to reload on HUP
				var module = require.resolve('../plugins/'+name+'/plugin');
				plugins.push(require(module)(eventBus, io, name));
				delete require.cache[module];
				
				console.log('Plugin "'+name+'" loaded');
				cb();
			} catch (e) {
				cb(e);
				console.error('Cannot load plugin '+name, e.stack); 
			}
		}
	});
};

module.exports.load = function(list, eventBus, app, io, cb) {
	// let plugins load additional client side code
	eventBus.on('addscripts', function(scripts) {
		console.log('adding scripts:', scripts);
		for(var i = 0; i < scripts.length; i++) {
			(function(script) {
				if (!script.filename) {
					script.filename = 'client.js';
				}
				
				// do not add a route more than once
				if (app.lookup.get('/plugins/'+script.plugin+'/'+script.filename).length == 0) {
					app.get('/plugins/'+script.plugin+'/'+script.filename, function (req, res) {
						fs.readFile(__dirname+'/../plugins/'+script.plugin+'/client/'+script.filename, function(err, data) {
							if (err) {
								res.send('not found', 404);
								console.log('plugin client script not found: '+__dirname+'/../plugins/'+script.plugin+'/client/'+script.filename, err);
								
							} else {
								res.send(data.toString());
							}
						});
						
					});
					console.log('added route /plugins/'+script.plugin+'/'+script.filename);
				}
				
				// load the client script on users when they join
				eventBus.on('userjoin', function(socket) {
					socket.emit('loadscript', '/plugins/'+script.plugin+'/'+script.filename);
				});
				
				
			})(scripts[i]);
		}
	});
	eventBus.on('addroutes', function(routes) {
		for(var i = 0; i < routes.length; i++) {
			(function(route) {
				if (app.lookup.get('/plugins/'+route.plugin+'/'+route.path).length == 0) {
					app.get('/plugins/'+route.plugin+'/'+route.path, route.callback);
				}
				console.log('added route /plugins/'+route.plugin+'/'+route.path);
			})(routes[i]);
		}
	});
	
	// now load all plugins
	(function loadPluginEach(i) {
		loadPlugin(eventBus, io, list[i], function(err) {
		
			if (i < list.length - 1) {
				loadPluginEach(++i);
			} else {
				cb(list);
			}
		});
	})(0);
};

module.exports.unload = function(eventBus, cb) {
	if (plugins.length == 0) {
		cb();
	}
	var removePluginEventBusListeners = function() {
		eventBus.removeAllListeners('procstart');
		eventBus.removeAllListeners('procstop');
		eventBus.removeAllListeners('connection');
		eventBus.removeAllListeners('userjoin');
		eventBus.removeAllListeners('addscripts');
		eventBus.removeAllListeners('addroutes');
		// TODO: remove app routes too!
	};
	var unload = function(index) {
		try {
			plugins[index].unload(function(err) {
				if (err) {
					console.log('Error unloading plugin #'+index+':', err);
				} else {
					console.log('Unloaded plugin '+plugins[index].name);
				}
				if (index < plugins.length - 1) {
					unload(++index);
				} else {
					removePluginEventBusListeners();
					plugins = [];
					cb();
				}
			});
		} catch (e) {
			console.log('Exception when removing plugin #'+index+':', e);
			if (index < plugins.length - 1) {
				unload(++index);
			} else {
				removePluginEventBusListeners();
				plugins = [];
				cb(plugins);
			}
		}
	}
	unload(0);
	
};
