if (typeof window.jQuery == 'undefined') {
	alert('Please add jquery in public/ folder! Look at this page\'s source for path.');
	
} else {
	$(document).ready(function() {
		window.location = '#';
		var socket = io.connect('/console');
		socket.on('connected', function (status) {
			$('#srcjsLoginButton').attr('disabled', null);
			$('#srcjsLogin').submit(function() {
				srcjs.login(socket, $('#srcjsLoginUsername').val(), $('#srcjsLoginPassword').val(), function(error, serverStatus) {
					if (error) {
						alert(error);
					} else {
						$('#srcjsLogin').hide();
						setTimeout($('#srcjsLogin').remove, 2000); // let browsers offer to save password
						$('#srcjsInterface').show();
						srcjs.init(socket, serverStatus);
					}
				});
			});
		});
		
		socket.on('loadscript', function(scripts) {
			var loadScript = function(index) {
				var path = '/plugins/'+scripts[index].plugin+'/'+scripts[index].filename;
				var script = document.createElement("script");
				script.type = "text/javascript";
				script.onload = function() {
					if (index < scripts.length - 1) {
						loadScript(++index);
					}
				};
				script.src = path+'?_='+Math.random();
				document.head.appendChild(script);
			};
			loadScript(0);
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
	
	
	
	var	consoleText = function(text, channel) {
		var div;
		if (channel) {
			div = $('<div class="'+channel+'"/>');
		} else {
			div = $('<div/>');
		}
		div.text(text);
		
		
		console.addLines([div]);
	};
	
	var btnStart, btnStop, btnHUP;
	
	var onStatus = function(status) {
		if (status == Status.STOPPED) {
			btnStart.attr('disabled', null);
			btnStop.attr('disabled', 'disabled');
			btnHUP.attr('disabled', 'disabled');
		} else {
			btnStart.attr('disabled', 'disabled');
			btnStop.attr('disabled', null);
			btnHUP.attr('disabled', null);
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
	
	var o = {
		login: function(socket, username, password, cb) {
			socket.emit('login', {
				username: username,
				password: password
			}, cb);
		},
		
		init: function(socket, status) {

			
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
				onStatus(Status.STOPPED);
				
				if (typeof data.signal != 'undefined' && data.signal !== null) {
					if (data.signal == 0) {
						consoleText('Process was not running or not found', 'system');
					} else {
						consoleText('Process forcefully killed with signal '+data.signal, 'system');
					}
				} else if (typeof data.code != 'undefined' && data.code !== null) {
					consoleText('Process stopped with exit code '+data.code, 'system');
				} else {
					consoleText('Process stopped with unknown exit code or was not running (anymore)', 'warn');
				}
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
				$('.srcjsTabPanels > .srcjsTabPanel:gt(0)').remove();
				tabs.splice(1);
				socket.emit('unloaded');
			});
			
			
			
			
			tabs = [];
			
			(function() {
				var consolePanel = $('<div/>');
				
				var buttonPanel = $('<div/>');
				btnStart = $('<button disabled>Start</button>').click(function() {
					consoleText('Starting server...', 'system');
					socket.emit('start');
				});
				btnStop = $('<button disabled>Stop</button>').click(function() {
					consoleText('Stopping server...', 'system');
					socket.emit('stop');
				});
				btnHUP = $('<button disabled>HUP</button>').click(function() {
					consoleText('Sending HUP to console...', 'system');
					socket.emit('HUP');
				});
				buttonPanel.append(btnStart, btnStop, btnHUP);
				consolePanel.append(buttonPanel);
				
				console = srcjs.ui.Console({
					title: 'Process I/O',
					inputListener: function(input) {
						if (input != '') {
							socket.emit('input', input);
							return true;
						}
						return false;
					},
					height: 400
				});
				consolePanel.append(console.panel());
				o.addTab('Process I/O', consolePanel, true);
				tabs[0].tab.click();
			})();
			
			onStatus(status);
		},
		
		plugins: {},
		
		addTab: function(title, panel, active) {
			var tab = $('<button>'+title+'</button>');
			if (active) {
				tab.addClass('active');
			}
			$('.srcjsTabs').append(tab);
			
			panel.hide();
			$('.srcjsTabPanels').append(panel);
			
			tabs.push({
				tab: tab,
				panel: panel,
			});
			tab.click(getTabClickHandler(tabs.length - 1));
		},
		
		escape: function(string) {
			return string.replace(/</g, "&lt;").replace(/>/g, "&gt;");
		}
		
	};
	return o;
})();
