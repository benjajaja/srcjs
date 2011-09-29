var fs = require('fs');

var EventBus = function() {
	require('events').EventEmitter.call(this);
};
EventBus.prototype = Object.create(require('events').EventEmitter.prototype, {
	constructor: {
		value: EventBus,
		enumerable: false
	}
});

module.exports = function(app) {
	var eventBus = new EventBus();
	eventBus.on('addscripts', function(scripts) {
		for(var i = 0; i < scripts.length; i++) {
			(function(script) {
				if (!script.filename) {
					script.filename = 'client.js';
				}
				
				console.log('added route /plugins/'+script.plugin+'/'+script.filename);
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
				eventBus.on('userjoin', function(socket) {
					socket.emit('loadscript', '/plugins/'+script.plugin+'/'+script.filename);
				});
				
			})(scripts[i]);
		}
	});	
	return eventBus;
};