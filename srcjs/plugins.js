var fs = require('fs');

var loadPlugin = function(eventBus, io, name) {
	fs.stat('./plugins/'+name, function(err, stat) {
		if (err) {
			console.err('plugin "'+name+'" not found');
		} else if (stat.isDirectory()) {
			try {
				require('../plugins/'+name+'/plugin')(eventBus, io, name);
				console.log('Plugin "'+name+'" loaded');
			} catch (e) {
				console.log('Cannot load plugin '+name, e); 
			}
		}
	});
};

module.exports = function(list, eventBus, io, cb) {
	for(var i = 0; i < list.length; i++) {
		loadPlugin(eventBus, io, list[i]);
	}
};