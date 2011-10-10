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

module.exports = function() {
	var eventBus = new EventBus();
	
	return eventBus;
};