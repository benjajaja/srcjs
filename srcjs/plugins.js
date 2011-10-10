var fs = require('fs');

var plugins = [];

var loadPlugin = function(eventBus, io, name, cb) {
	fs.stat('./plugins/'+name, function(err, stat) {
		if (err) {
			console.error('plugin "'+name+'" not found');
		} else if (stat.isDirectory()) {
			try {
				
				var module = require.resolve('../plugins/'+name+'/plugin');
				
				plugins.push(require(module).load(eventBus, io, name));
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
	eventBus.on('addscripts', function(scripts) {
		console.log('adding scripts:', scripts);
		for(var i = 0; i < scripts.length; i++) {
			(function(script) {
				if (!script.filename) {
					script.filename = 'client.js';
				}
				
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
				
				//io.of('/console').in('all').emit('loadscript', '/plugins/'+script.plugin+'/'+script.filename);
				eventBus.on('userjoin', function(socket) {
					socket.emit('loadscript', '/plugins/'+script.plugin+'/'+script.filename);
				});
				
				
			})(scripts[i]);
		}
	});
	
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
					eventBus.removeAllListeners('procstart');
					eventBus.removeAllListeners('procstop');
					eventBus.removeAllListeners('userjoin');
					eventBus.removeAllListeners('userleave');
					eventBus.removeAllListeners('addscripts');
					plugins = [];
					cb();
				}
			});
		} catch (e) {
			console.log('Exception when removing plugin #'+index+':', e);
			if (index < plugins.length - 1) {
				unload(++index);
			} else {
				eventBus.removeAllListeners('procstart');
				eventBus.removeAllListeners('procstop');
				eventBus.removeAllListeners('userjoin');
				eventBus.removeAllListeners('userleave');
				eventBus.removeAllListeners('addscripts');
				plugins = [];
				cb(plugins);
			}
		}
	}
	unload(0);
	
};
