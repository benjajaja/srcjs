if (typeof window.jQuery == 'undefined') {
	alert('Please add jquery in public/ folder! Look at this page\'s source for path.');
	
} else {
	$(document).ready(function() {
		var socket = io.connect();
		socket.on('connected', function (status) {
			$('#srcjsLoginButton').attr('disabled', null);
			$('#srcjsLogin').submit(function() {
				srcjs.login(socket, $('#srcjsLoginUsername').val(), $('#srcjsLoginPassword').val(), function(error, serverStatus) {
					if (error) {
						alert(error);
					} else {
						$('#srcjsLogin').hide();
						$('#srcjsInterface').show();
						srcjs.init(socket, serverStatus);
					}
				});
			});
		});
		
		
		
	});
}

var srcjs = (function() {
	function makeEnum(array) {
		var p_enum = {};
		for(var i = 0; i < array.length; i++) {
			p_enum[array[i]] = array[i];
		}
		return p_enum;
	};
	var Status = makeEnum(['STOPPED', 'STARTED']);
	var Channels = makeEnum(['WARN', 'STDOUT', 'STDERR', 'SYSTEM']);
	var console;
	
	var history = (function() {
		// notice importance of pre- and post-increment on "index" (it's for brevity)
		var history = [];
		var index = 0;
		var size = 0;
		return {
			push: function(command) {
				history[index++] = command;
				history.splice(index + 1);
				size++;
			},
			back: function(input) {
				if (index > 0) {
					input.val(history[--index]);
				}
			},
			forth: function(input) {
				if (typeof history[index + 1] != 'undefined') {
					input.val(history[++index]);
				} else {
					if (index < size) {
						index++;
					}
					input.val('');
				}
			}
		};
	})();
	
	return {
		login: function(socket, username, password, cb) {
			socket.emit('login', {
				username: username,
				password: password
			}, cb);
		},
		
		init: function(socket, status) {
			console = $('#srcjsConsole');
			socket.on('started', srcjs.onStarted);
			for(var CHANNEL in Channels) {
				// separate scope for CHANNEL
				(function(CHANNEL) {
					socket.on(CHANNEL.toLowerCase(), function(data) {
						srcjs.console(data, CHANNEL.toLowerCase());
					});
				})(CHANNEL);
			}
			socket.on('exit', srcjs.onExit);
			
			srcjs.onStatus(status);
			
			$('#srcjsBtnStart').click(function() {
				srcjs.console('Starting server...', 'system');
				srcjs.start(socket);
			});
			
			$('#srcjsBtnStop').click(function() {
				srcjs.console('Stopping server...', 'system');
				srcjs.stop(socket);
			});
			
			$('#srcjsBtnInput').click(function() {
				srcjs.input(socket);
			});
			
			$('#srcjsBtnHUP').click(function() {
				srcjs.console('Sending HUP to console...', 'system');
				srcjs.sigHUP(socket);
			});
			
			$('#input').keyup(function(e) {
				if (e.which == 13) {
					srcjs.input(socket);
				} else if (e.which == 38) {
					history.back($('#input'));
				} else if (e.which == 40) {
					history.forth($('#input'));
				}
			});
		},
		
		start: function(socket) {
			socket.emit('start');
		},
		
		stop: function(socket) {
			socket.emit('stop');
		},
		
		input: function(socket) {
			var command = $('#input').val();
			if (command != '') {
				socket.emit('input', command);
				history.push(command);
				$('#input').val('');
			}
		},
		
		sigHUP: function(socket) {
			socket.emit('HUP');
		},
		
		onStarted: function() {
			srcjs.onStatus(Status.STARTED);
		},
		
		console: function(text, channel) {
			var div;
			if (channel) {
				div = $('<div class="'+channel+'"/>');
			} else {
				div = $('<div/>');
			}
			div.text(text);
			
			if (console.children().size() > 1000) {
				console.children().filter(':lt(100)').remove();
			}
			console.append(div);
			console.scrollTop(console[0].scrollHeight);
		},
		
		
		onExit: function(data) {
			if (typeof data.signal != 'undefined' && data.signal !== null) {
				srcjs.console('Process forcefully killed with signal '+data.signal, 'system');
			} else if (typeof data.code != 'undefined' && data.code !== null) {
				srcjs.console('Process stopped with exit code '+code, 'system');
			} else {
				window.console.log(data);
				srcjs.console('Process stopped with unknown exit code or was not running (anymore)', 'warn');
			}
			srcjs.onStatus(Status.STOPPED);
		},
		
		onStatus: function(status) {
			if (status == Status.STOPPED) {
				$('#srcjsBtnStart').attr('disabled', null);
				$('#srcjsBtnStop').attr('disabled', 'disabled');
				$('#srcjsBtnInput').attr('disabled', 'disabled');
			} else {
				$('#srcjsBtnStart').attr('disabled', 'disabled');
				$('#srcjsBtnStop').attr('disabled', null);
				$('#srcjsBtnInput').attr('disabled', null);
			}
		},
	};
})();
