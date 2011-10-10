// please use srcjs.plugins.PLUGINNAME as your namespace
// implement onStatus(status) to be notified of start/stop status

srcjs.plugins.mc_jsonapi = (function() {

	var panel = (function() {
		var chatInputListener = null;
		var panel = $('<div class="srcjsTabPanel srcjsJsonapi"/>');
		
		var splitPanel = srcjs.ui.SplitPanel();
		panel.append(splitPanel.panel);
		
		var chatConsole = srcjs.ui.Console({
			title: 'Chat',
			inputListener: function(input) {
				if (chatInputListener !== null) {
					chatInputListener(input);
				}
			},
			height: 200
		});
		splitPanel.append(chatConsole.panel);
		
		var playerList = (function() {
			var panel = srcjs.ui.Box({
				title: 'Players'
			});
			
			var pnlList = $('<div/>');
			panel.append(pnlList);
			
			var addPlayer = function(name) {
				var anchor = $('<a href="#'+name+'">'+name+'</a>');
				anchor.data('name', name);
				pnlList.append(anchor);
			};
			return {
				panel: panel.panel,
				
				setPlayers: function(players) {
					pnlList.empty();
					for(var i = 0; i < players.length; i++) {
						addPlayer(players[i].name);
					}
				},
				
				setPlayerConnection: function(connection) {
					if (connection.action == 'connected') {
						var found = false;
						var anchors = pnlList.children();
						for(var i = 0; i < anchors.length; i++) {
							if ($(anchors[i]).data('name') == connection.name) {
								found = true;
								break;
							}
						}
						
						if (!found) {
							addPlayer(connection.name);
						}
					} else if (connection.action == 'disconnected') {
						var anchors = pnlList.children();
						for(var i = 0; i < anchors.length; i++) {
							if ($(anchors[i]).data('name') == connection.name) {
								$(anchors[i]).remove();
							}
						}
					}
				}
			};
		})();
		splitPanel.append(playerList.panel());
		
		
		
		var o = {
			panel: panel,
			
			setPlayers: function(players) {
				playerList.setPlayers(players);
			},
			
			setPlayerConnection: function(connection) {
				playerlist.setPlayerConnection(connection);
			},
			
			setChatInputListener: function(listener) {
				chatInputListener = listener;
			},
			
			onChat: function(chat) {
				var date = new Date(chat.time * 1000);
				date.setHours(date.getHours() + (-1 * date.getTimezoneOffset()/60));
				var player, name;
				if (chat.player === null) {
					player = $('<span class="srcjsJsonapiChatConsole"/>');
					player.text('Console');
				} else {
					name = chat.player;
					player = $('<a href="#'+name.replace(/"/, '&quot;')+'" class="srcjsJsonapiChatPlayer"/>');
					player.click(function() {
						o.selectPlayer(name);
					});
					player.text(name);
				}
				
				chatConsole.append([
					$('<span class="srcjsJsonapiChatTimestamp"/>').text('[' + date.getHours()
						+ ':' + date.getMinutes()
						+ ':' + date.getSeconds() + ']'),
					player,
					$('<span>: </span>'),
					$('<span/>').text(chat.message)
				]);
				/*'[' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + '] '
					+ player
					+ ': ' + $('<span/>').text(chat.message);*/
			},
		};
		return o;
	})();

	// connect to private socket.io channel
	var pluginio = io.connect('/mc_jsonapi');
	
	
	pluginio.on('error', function(error) {
		console.log('jsonapi error:', error);
	});
	
	pluginio.on('players', function(players) {
		panel.setPlayers(players);
	});
	
	pluginio.on('connection', function(connection) {
		panel.setPlayerConnection(connection);
	});
	
	pluginio.on('chat', panel.onChat);
	
	panel.setChatInputListener(function(input) {
		pluginio.emit('chat', input);
		var date = new Date();
		date.setHours(date.getHours() + date.getTimezoneOffset()/60);
		panel.onChat({
			player: null,
			message: input,
			time: Math.floor(date.getTime() / 1000)
		});
	});
	
	// let's add a tab
	srcjs.addTab('JSONAPI', panel.panel);
	
	// MUST return object with property onStatus: function(status) and onUnload: function()
	return {
		onStatus: function(status) {
			panel.val(panel.val() + '\n' + 'srcrcon plugin notified of status "'+status+'" on client side');
		},
		onUnload: function() {
			pluginio.removeAllListeners('error');
			pluginio.removeAllListeners('players');
		}
	}
})();