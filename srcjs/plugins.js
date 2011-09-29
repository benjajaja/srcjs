var fs = require('fs');

var plugins = [];

var loadPlugin = function(eventBus, io, name) {
	fs.stat('./plugins/'+name, function(err, stat) {
		if (err) {
			console.error('plugin "'+name+'" not found');
		} else if (stat.isDirectory()) {
			try {
				plugins.push(require('../plugins/'+name+'/plugin')(eventBus, io, name));
				console.log('Plugin "'+name+'" loaded');
			} catch (e) {
				console.err('Cannot load plugin '+name, e); 
			}
		}
	});
};

module.exports.load = function(list, eventBus, io, cb) {
	for(var i = 0; i < list.length; i++) {
		loadPlugin(eventBus, io, list[i]);
	}
	cb();
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
				plugins = [];
				cb(plugins);
			}
		}
	}
	unload(0);
	
};