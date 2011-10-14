var net = require("net");
var crypto = require('crypto');
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


var getKey = function(methodName, username, password, salt) {
	var shasum = crypto.createHash('sha256');
	shasum.update(username + methodName + password + salt);
	return shasum.digest('hex');
};

var getLineCall = function(method, args, username, password, salt) {
	var line = '/api/call?method='+method;
	if (args) {
		line += '&args='+escape(JSON.stringify(args));
	}
	line += '&key='+getKey(method, username, password, salt)+'\n';
	return line;
};

var getLineSubscribe = function(channel, username, password, salt) {
	var line = '/api/subscribe?source='+channel;
	line += '&key='+getKey(channel, username, password, salt)+'\n';
	return line;
};

var createConnection = function(port, host, cb) {
	var socket = net.createConnection(port, host);
	socket.on('connect', function(e) {
		socket.removeAllListeners('connect');
		socket.removeAllListeners('error');
		cb(null, socket);
	});
	socket.on('error', function(e) {
		socket.removeAllListeners('connect');
		socket.removeAllListeners('error');
		cb(e, socket);
	});
};

var closeConnection = function(socket) {
	if (socket !== null) {
		socket.removeAllListeners('data');
		socket.removeAllListeners('end');
		socket.removeAllListeners('error');
		socket.destroy();
	}
};



var getQueue = (function(callback) {
	var queue = [];
	var isProcessing = false;
	
	var processQueue = (function() {
		var buffer = null;
		
		return function(queue, cb) {
			var newBuffer, tmp, lines, string, lastLineBreakPos;
			while(queue.length > 0) {
				
				if (buffer !== null) {
					newBuffer = queue.shift();
					tmp = new Buffer(buffer.length + newBuffer.length);
					buffer.copy(tmp);
					newBuffer.copy(tmp, buffer.length);
					buffer = tmp;
				} else {
					buffer = queue.shift();
				}
				
				string = buffer.toString();
				lastLineBreakPos = string.lastIndexOf('\n');
				if (lastLineBreakPos != -1) {
					tmp = new Buffer(Buffer.byteLength(string.substring(lastLineBreakPos)));
					buffer.copy(tmp, 0, Buffer.byteLength(string.substring(0, lastLineBreakPos)));
					buffer = tmp;
					
					lines = string.split('\n');
					for(
							var i = 0, ilen = (lastLineBreakPos == string.length - 1 ? lines.length - 1: lines.length - 2);
							i < ilen;
							i++) {
						if (lines[i] != '') {
							cb(lines[i]);
						}
					}
				}
			}
		};
	})();
	
	return function(buffer) {
		queue.push(buffer);
		
		if (!isProcessing) {
			isProcessing = true;
			processQueue(queue, callback);
			isProcessing = false;
		}
	}
});

var JSONAPIConnection = function(host, port, username, password, salt, debug) {
	if (typeof debug == 'undefined') {
		debug = false;
	}
	var socket = null;
	var timer = null;
	var eventBus = new EventBus();
	
	var onError = function(message, error) {
		eventBus.emit('error', message, error);
		if (debug) {
			eventBus.emit('debug', 'ERROR: '+message);
		}
	};
	
	var onJsonLine = function(line) {
		var result = null;
		try {
			result = JSON.parse(line);
		} catch (e) {
			onError('cannot parse JSON string ('+line+')', e);
			return;
		}
		
			
		if (!result.result || result.result != 'success') {
			onError('result is not "success"', result);
			
		} else if (!result.source || result.success === false) {
			onError('result is "success", but "source" or "success" not set', result);
			
		} else {
			eventBus.emit(result.source, result.success);
		}
	};
	
	
	
	return {
		connect: function(timeout, retries, cb) {
			if (debug) {
				eventBus.emit('debug', 'connecting to '+host+':'+port+', '+retries+' retries...');
			}
			var connect = function() {
				var queueData = getQueue(onJsonLine);
				createConnection(port, host, function(err, nsocket) {
					if (err) {
						if (retries > 0) {
							if (debug) {
								eventBus.emit('debug', 'cannot connect, '+retries+' left...');
							}
							retries--;
							timer = setTimeout(connect, timeout * 1000);
						} else {
							if (debug) {
								eventBus.emit('debug', 'connection failed, no more retries left');
							}
							
						}
					} else {
						socket = nsocket;
						
						socket.on('data', function(data) {
							queueData(data);
						});
						
						/*socket.on('data', function(data) {
							pushData(data, function(line) {
								var result = null;
								try {
									result = JSON.parse(line);
								} catch (e) {
									onError('cannot parse JSON string ('+line+')', e);
									return;
								}
								
									
								if (!result.result || result.result != 'success') {
									onError('result is not "success"', result);
									
								} else if (!result.source || result.success === false) {
									onError('result is "success", but "source" or "success" not set', result);
									
								} else {
									eventBus.emit(result.source, result.success);
								}
								
							});
							
						});*/
						
						socket.on('end', function(data) {
							closeConnection(socket);
							socket = null;
						});
						socket.on('error', function(data) {
							closeConnection(socket);
							socket = null;
						});
						cb(true);						
					}
				});
			};
			connect();
		},
		
		on: function(event, listener) {
			eventBus.on(event, listener);
		},
		
		once: function(event, listener) {
			eventBus.once(event, listener);
		},
		
		runMethod: function(method, args) {
			if (socket !== null) {
				var data = getLineCall(method, args, username, password, salt);
				socket.write(data);
				return data;
			} else {
				return false;
			}
		},
		
		subscribe: function(channel) {
			if (socket !== null) {
				var data = getLineSubscribe(channel, username, password, salt);
				socket.write(data);
				return data;
			} else {
				return false;
			}
		},
		
		unload: function() {
			clearTimeout(timer);
			eventBus = new EventBus(); // does this clear event listeners?
			
			if (socket !== null) {
				closeConnection(socket);
				socket = null;
			}
		},
		
		removeListener: function(event, listener) {
			eventBus.removeListener(event, listener);
		},
		
		removeAllListeners: function(event) {
			eventBus.removeAllListeners(event);
		}
	};
};

module.exports = JSONAPIConnection;