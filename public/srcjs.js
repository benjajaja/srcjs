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

var srcjs = (function() {
	function makeEnum(array) {
		var p_enum = {};
		for(var i = 0; i < array.length; i++) {
			p_enum[array[i]] = array[i];
		}
		return p_enum;
	};
	var Status = makeEnum(['STOPPED', 'STARTED']);
	
	
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
			socket.on('started', srcjs.onStarted);
			socket.on('stdout', srcjs.onStdout);
			socket.on('stderr', srcjs.onStderr);
			socket.on('warn', srcjs.onWarning);
			socket.on('exit', srcjs.onExit);
			
			srcjs.onStatus(status);
			
			$('#btnStart').click(function() {
				srcjs.start(socket);
			});
			
			$('#btnStop').click(function() {
				srcjs.stop(socket);
			});
			
			$('#btnInput').click(function() {
				srcjs.input(socket);
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
		
		onStarted: function() {
			srcjs.onStatus(Status.STARTED);
		},
		
		console: function(text, className) {
			var div;
			if (className) {
				div = $('<div class="'+className+'"/>');
			} else {
				div = $('<div/>');
			}
			div.text(text);
			$('#console').append(div);
			$('#console').scrollTop($('#console')[0].scrollHeight);
		},
		
		onStdout: function(data) {
			srcjs.console(data);
		},
		
		onStderr: function(data) {
			srcjs.console(data, 'error');
		},
		
		onExit: function(code) {
			srcjs.console('STOPPED WITH EXIT CODE '+code, 'system');
			srcjs.onStatus(Status.STOPPED);
		},
		
		onStatus: function(status) {
			if (status == Status.STOPPED) {
				$('#btnStart').attr('disabled', null);
				$('#btnStop').attr('disabled', 'disabled');
				$('#btnInput').attr('disabled', 'disabled');
			} else {
				$('#btnStart').attr('disabled', 'disabled');
				$('#btnStop').attr('disabled', null);
				$('#btnInput').attr('disabled', null);
			}
		},
		
		onWarning: function(message) {
			srcjs.console(message, 'warning');
		}
	};
})();
