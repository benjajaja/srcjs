var fs = require('fs');

var plugins = [];

var loadPlugin = function(pluginEventBus, io, name, pluginConfig, cb) {
	fs.stat('./plugins/'+name, function(err, stat) {
		var module = null;
		if (err) {
			console.error('plugin "'+name+'" not found');
		} else if (stat.isDirectory()) {
			try {
				// load module and clear cache inmediately to be able to reload on HUP
				module = require.resolve('../plugins/'+name+'/'+name);
				plugins.push(require(module)(pluginEventBus, io, pluginConfig, name));
				delete require.cache[module];
				
				console.log('plugin "'+name+'" loaded');
				cb();
			} catch (e) {
				cb(e);
				console.error('Cannot load plugin '+module, e.stack); 
			}
		}
	});
};

module.exports.load = function(list, pluginEventBus, app, io, config, cb) {
	// let plugins load additional client side code
	pluginEventBus.on('addscripts', function(scripts, pluginName) {
		for(var i = 0; i < scripts.length; i++) {
			(function(script) {
				if (!script.filename) {
					script.filename = pluginName+'.js';
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
					console.log('added script /plugins/'+script.plugin+'/'+script.filename);
				}
			})(scripts[i]);
		}
		// load the client script on users when they join
		pluginEventBus.on('userjoin', function(socket) {
			if (socket) {
				console.log('sending loadscript to a client');
				socket.emit('loadscript', scripts);
			} else {
				console.log('sending loadscript to ALL clients');
				io.of('/console').emit('loadscript', scripts);
			}
		});
	});
	pluginEventBus.on('addroutes', function(routes, pluginName) {
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
		var pluginConfig = config ? config[list[i]] : null;
		loadPlugin(pluginEventBus, io, list[i], pluginConfig, function(err) {
		
			if (i < list.length - 1) {
				loadPluginEach(++i);
			} else {
				cb(list);
			}
		});
	})(0);
};

module.exports.unload = function(pluginEventBus, cb) {
	if (plugins.length == 0) {
		cb();
	}
	var removePluginEventBusListeners = function() {
		pluginEventBus.removeAllListeners('procstart');
		pluginEventBus.removeAllListeners('procstop');
		pluginEventBus.removeAllListeners('connection');
		pluginEventBus.removeAllListeners('userjoin');
		pluginEventBus.removeAllListeners('addscripts');
		pluginEventBus.removeAllListeners('addroutes');
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
	};
	unload(0);
	
};
