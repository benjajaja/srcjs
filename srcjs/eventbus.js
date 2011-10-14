var events = require('events');

var EventBus = function() {
	events.EventEmitter.call(this);
};
EventBus.prototype = Object.create(events.EventEmitter.prototype, {
	constructor: {
		value: EventBus,
		enumerable: false
	}
});

module.exports = function() {
	var eventBus = new EventBus();
	
	return eventBus;
};