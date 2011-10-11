// please use srcjs.plugins.PLUGINNAME as your namespace
// implement onStatus(status) to be notified of start/stop status

srcjs.plugins.mc_jsonapi = (function() {

	var panel = (function() {
		var chatInputListener = null, consoleInputListener = null;
		var panel = $('<div class="srcjsTabPanel srcjsJsonapi"/>');
		
		var splitPanel = srcjs.ui.SplitPanel();
		panel.append(splitPanel.panel);
		
		var leftDiv = $('<div/>');
		var chatConsole = srcjs.ui.Console({
			title: 'Chat',
			inputListener: function(input) {
				if (chatInputListener !== null) {
					chatInputListener(input);
				}
			},
			height: 300,
			css: {
				marginBottom: '5px'
			}
		});
		leftDiv.append(chatConsole.panel());
		
		var consoleConsole = srcjs.ui.Console({
			title: 'Console',
			inputListener: function(input) {
				if (consoleInputListener !== null) {
					consoleInputListener(input);
				}
			},
			height: 300
		});
		leftDiv.append(consoleConsole.panel());
		
		splitPanel.append(leftDiv);
		
		
		var links = [];
		var playerList = srcjs.ui.ListBoxFormatted({
			title: 'Players',
			links: links,
			formatColumns: function(index, item) {
				var field = $('<span/>');
				field.css({width: '24%'}); // 96 / 4
				switch(index) {
					case 0:
						field.text(item == true ? '@' : '');
						field.css({width: '4%'});
						break;
					
					case 3:
						field.text(item+'/20');
						break;
					
					case 4:
						var img = $('<img/>');
						img.onerror = function() {
							img.onerror = null;
							img.attr('src', 'http://www.minecraftdatavalues.com/images/'+(item < 256 ? '1' : '2')+'/'+item+'_0.png');
						}
						img.attr('src', 'http://www.minecraftdatavalues.com/images/'+(item < 256 ? '1' : '2')+'/'+item+'.png');
						field.append(img);
						break;
					
					default:
						field.text(item);
						break;
				};
				
				return field;
			}
		});
		splitPanel.append(playerList.panel());
		
		
		
		
		
		
		var o = {
			panel: panel,
			
			setPlayers: function(players) {
				links = [];
				//console.log(players[0]);
				for(var i = 0; i < players.length; i++) {
					links.push([players[i].op, players[i].name, players[i].worldInfo.name, players[i].health,
						(players[i].itemInHand ? players[i].itemInHand.type : null)]);
				}
				playerList.set(links);
			},
			
			setPlayerConnection: function(connection) {
				console.log('connection:', connection);
				var index = links.indexOf(connection.name);

				if (connection.action == 'connected') {
					if (index == -1) {
						links.push(connection.name);
						playerList.set(links);
					}
				} else if (connection.action == 'disconnected') {
					if (index != -1) {
						links = links.splice(index, 1);
						playerList.set(links);
					}
				}
			},
			
			setChatInputListener: function(listener) {
				chatInputListener = listener;
			},
			
			setConsoleInputListener: function(listener) {
				consoleInputListener = listener;
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
				
				chatConsole.addLines([
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
			
			onConsole: function(line) {
				consoleConsole.addLines([line.line]);
			}
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
	pluginio.on('console', panel.onConsole);
	
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
	
	panel.setConsoleInputListener(function(input) {
		pluginio.emit('console', input);
	});
	
	// let's add a tab
	srcjs.addTab('JSONAPI', panel.panel);
	
	// MUST return object with property onStatus: function(status) and onUnload: function()
	return {
		onStatus: function(status) {
			
		},
		onUnload: function() {
			pluginio.removeAllListeners('error');
			pluginio.removeAllListeners('players');
		}
	}
})();