if (typeof window.jQuery == 'undefined') {
	alert('Please add jquery in public/ folder! Look at this page\'s source for path.');
	
} else {
	$(document).ready(function() {
		var socket = io.connect('/console');
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
		
		socket.on('loadscript', function(path) {
			//$(document.head).append($('<script src="'+path+'"/>'));
			var script = document.createElement("script");
			script.type = "text/javascript";
			script.src = path+'?_='+Math.random();
			document.head.appendChild(script);
		});
		
		socket.on('disconnect', function (status) {
			//alert('Disconnected. Please log in again.');
			window.location.reload();
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
	var console, tabs;
	
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
	
	var input = function(socket) {
		var command = $('#input').val();
		if (command != '') {
			socket.emit('input', command);
			history.push(command);
			$('#input').val('');
		}
	};
	
	var	consoleText = function(text, channel) {
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
	};
	
	var onStatus = function(status) {
		if (status == Status.STOPPED) {
			$('#srcjsBtnStart').attr('disabled', null);
			$('#srcjsBtnStop').attr('disabled', 'disabled');
			$('#srcjsBtnInput').attr('disabled', 'disabled');
		} else {
			$('#srcjsBtnStart').attr('disabled', 'disabled');
			$('#srcjsBtnStop').attr('disabled', null);
			$('#srcjsBtnInput').attr('disabled', null);
		}
		
		for(var name in srcjs.plugins) {
			if (typeof srcjs.plugins[name].onStatus == 'function') {
				srcjs.plugins[name].onStatus(status);
			}
		}
	};
	
	var getTabClickHandler = function(index) {
		return function(e) {
			for(var i = 0; i < tabs.length; i++) {
				if (i == index) {
					tabs[i].panel.show();
					tabs[i].tab.addClass('active');
				} else {
					tabs[i].panel.hide();
					tabs[i].tab.removeClass('active');
				}
			}
		};
	};
	
	return {
		login: function(socket, username, password, cb) {
			socket.emit('login', {
				username: username,
				password: password
			}, cb);
		},
		
		init: function(socket, status) {
			console = $('#srcjsConsole');
			socket.on('started', function() {
				onStatus(Status.STARTED);
			});
			for(var CHANNEL in Channels) {
				// separate scope for CHANNEL
				(function(CHANNEL) {
					socket.on(CHANNEL.toLowerCase(), function(data) {
						consoleText(data, CHANNEL.toLowerCase());
					});
				})(CHANNEL);
			}
			socket.on('exit', function(data) {
				if (typeof data.signal != 'undefined' && data.signal !== null) {
					consoleText('Process forcefully killed with signal '+data.signal, 'system');
				} else if (typeof data.code != 'undefined' && data.code !== null) {
					consoleText('Process stopped with exit code '+code, 'system');
				} else {
					consoleText('Process stopped with unknown exit code or was not running (anymore)', 'warn');
				}
				onStatus(Status.STOPPED);
			});
			socket.on('unload', function(data) {
				for(var name in srcjs.plugins) {
					if (typeof srcjs.plugins[name].onUnload == 'function') {
						try {
							srcjs.plugins[name].onUnload();
						} catch(e) {
							window.console.log('error while unloading plugin '+name+':', e);
						}
					}
				}
				srcjs.plugins = {};
				$('.srcjsTabs > button:gt(0)').remove();
				$('.srcjsTabPanels > srcjsTabPanel:gt(0)').remove();
				tabs.splice(1);
				socket.emit('unloaded');
			});
			
			onStatus(status);
			
			$('#srcjsBtnStart').click(function() {
				consoleText('Starting server...', 'system');
				socket.emit('start');
			});
			
			$('#srcjsBtnStop').click(function() {
				consoleText('Stopping server...', 'system');
				socket.emit('stop');
			});
			
			
			$('#srcjsBtnInput').click(function() {
				input(socket);
			});
			
			$('#srcjsBtnHUP').click(function() {
				consoleText('Sending HUP to console...', 'system');
				socket.emit('HUP');
			});
			
			$('#input').keyup(function(e) {
				if (e.which == 13) {
					input(socket);
				} else if (e.which == 38) {
					history.back($('#input'));
				} else if (e.which == 40) {
					history.forth($('#input'));
				}
			});
			
			tabs = [{
				tab: $('.srcjsTabs').children().first(),
				panel: $('.srcjsTabPanels').children().first(),
			}];
			tabs[0].tab.click(getTabClickHandler(0));
		},
		
		plugins: {},
		
		addTab: function(title, panel) {
			if (typeof title != 'string' || typeof panel != 'object') {
				window.console.log('incorrect parameter(s) for srcjs.addTab - expected string, element');
				return;
			}
			var tab = $('<button>'+title+'</button>');
			$('.srcjsTabs').append(tab);
			
			panel.addClass('srcjsTabPanel');
			panel.hide();
			$('.srcjsTabPanels').append(panel)
			
			tabs.push({
				tab: tab,
				panel: panel,
			});
			tab.click(getTabClickHandler(tabs.length - 1));
		}
	};
})();
