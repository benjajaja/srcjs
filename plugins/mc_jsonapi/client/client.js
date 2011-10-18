// please use srcjs.plugins.PLUGINNAME as your namespace

srcjs.plugins.mc_jsonapi = (function() {
	function padWithZeros(number) {
		if (number < 10) {
			return '0'+number;
		} else {
			return ''+number;
		}
	}

	var panel = (function() {
		var chatInputListener = null, consoleInputListener = null;
		var panel = $('<div class="srcjsTabPanel srcjsJsonapi"/>');
		panel.hide();
		
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
			height: 300,
			css: {
				marginBottom: '5px'
			}
		});
		leftDiv.append(consoleConsole.panel());
		
		var plugins = [];
		var pluginList = srcjs.ui.ListBoxFormatted({
			title: 'Plugins',
			formatColumns: function(index, item, listIndex) {
				switch(index) {
					case 0:
						var checkbox = $('<input type="checkbox"/>');
						if (item) {
							checkbox.attr('checked', 'checked');
						}
						checkbox.click(function() {
							var enabled = checkbox[0].checked ? true : false;
							pluginio.emit('pluginSetEnabled', {plugin: plugins[listIndex][1], enabled: enabled}, function(err) {
								console.log('pluginSetEnabled '+enabled+': '+err);
							});
						});
						return checkbox;
						
					case 1:
					case 2:
					default:
						return item;
						
					case 3:
						if (item !== null) {
							return '<a href="'+item+'">Homepage</a>';
						} else {
							return '';
						}
				};
			},
			css: {
				marginBottom: '5px'
			}
		});
		pluginList.getBody().css({overflow: 'auto', height: '400px'});
		leftDiv.append(pluginList.panel);
		
		
		splitPanel.append(leftDiv);
		
		var rightDiv = $('<div/>');
		var playerNames = [];
		var playerList = srcjs.ui.ListBoxLinksFormatted({
			title: 'Players',
			formatColumns: function(index, item, listIndex) {
				switch(index) {
					case 0:
						return item == true ? '@' : '';
					
					case 3:
						return item+'/20';
						break;
					
					case 4:
						return srcjs.plugins.mc_jsonapi.getItemIcon(item, 0);
					
					default:
						return item;
				};
			},
			getItemView: function(index) {
				pluginio.emit('getPlayer', playerNames[index], function(data) {
					srcjs.plugins.mc_jsonapi.playerview.setPlayerData(data);
				});
				return {
					element: srcjs.plugins.mc_jsonapi.playerview.panel(playerNames[index], playerNames, function(command, args) {
						pluginio.emit('command', {command: command, args: args}, function(err) {
							console.log('ran command '+command+': '+err);
						});
					}),
					title: playerNames[index],
					onRemove: function(callback) {
						callback();
					}
				};
			},
			css: {
				marginBottom: '5px'
			}
		});
		rightDiv.append(playerList.panel());
		
		var serverInfo = (function() {
			var pointData = {memory: [], ticks: []}, totalPoints = 50;
			for(var i = 0; i < totalPoints; i++) {
				pointData.memory[i] = 0;
				pointData.ticks[i] = 0;
			}
			
			function zip(data) {
				var zip = [[], []];
				for(var i = 0; i < totalPoints; i++) {
					zip[0].push([i, pointData.memory[i]]);
					zip[1].push([i, pointData.ticks[i]]);
				}
				return zip;
			};

			var graph = $('<div style="width: 400px; height: 200px; margin: 0 auto"/>');
			var panel = srcjs.ui.Box({
				title: 'Server info',
			});
			var o = {
				panel: panel.panel(),
				addTick: function(data) {
					pointData.memory = pointData.memory.slice(1);
					pointData.memory.push(100 * data.memoryUsed / data.memoryTotal);
					
					pointData.ticks = pointData.ticks.slice(1);
					pointData.ticks.push((20 - data.tps) * 5);
					
					
					plot.setData(zip(pointData));
					plot.draw();
				},
				setServerInfo: function(server) {
					serverInfo.html('');
					serverInfo.append($('<h4>').text(server.serverName));
					
					var worldList = $('<ul/>');
					for(var i = 0; i < server.worlds.length; i++) {
						worldList.append($('<li/>').text(server.worlds[i].name));
					}
					
					serverInfo.append(worldList);
				}
			};
			$(document.body).append(graph);
			var plot = plot = $.plot(graph, zip(pointData), {
				series: {
					lines: { show: true }
				},
				yaxis: {
					min: 0, max: 100
				},
				xaxis: {
					show: false
				},
				legend: {
					show: true
				},
				grid: {
					backgroundColor: { colors: ["#fff", "#eee"] }
				}
			});
			var serverInfo = $('<div/>');
			panel.append($('<div class="srcjsPanelBody" style="padding: 10px 0"/>').append(serverInfo).append(graph));

			return o;
		})();
		rightDiv.append(serverInfo.panel);
		
		splitPanel.append(rightDiv);
		
		
		
		
		
		var o = {
			panel: panel,
			
			setPlayers: function(players) {
				var links = [];
				playerNames = [];
				//console.log(players[0]);
				for(var i = 0; i < players.length; i++) {
					links.push([players[i].op, players[i].name, players[i].worldInfo.name, players[i].health,
						(players[i].itemInHand ? players[i].itemInHand.type : null)]);
					playerNames.push(players[i].name);
				}
				playerList.set(links);
			},
			
			setPlayerConnection: function(connection) {
				console.log('connection:', connection);
				var index = playerNames.indexOf(connection.name);

				if (connection.action == 'connected') {
					if (index == -1) {
						playerNames.push(connection.name);
						//playerList.set(playerNames);
					}
				} else if (connection.action == 'disconnected') {
					if (index != -1) {
						playerNames = links.splice(index, 1);
						//playerList.set(playerNames);
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
					$('<span class="srcjsJsonapiChatTimestamp"/>').text('[' + padWithZeros(date.getHours())
						+ ':' + padWithZeros(date.getMinutes())
						+ ':' + padWithZeros(date.getSeconds()) + '] '),
					player,
					$('<span>: </span>'),
					$('<span/>').text(chat.message)
				]);
			},
			
			onConsole: function(line) {
				consoleConsole.addLines([line.line]);
			},
			
			onLagmeter: function(data) {
				serverInfo.addTick(data);
			},
			
			onPlugins: function(data) {
				plugins = [];
				for(var i = 0; i < data.length; i++) {
					plugins.push([data[i].enabled, data[i].name, data[i].version, data[i].website]);
				}
				pluginList.set(plugins);
			},
			
			onServer: function(server) {
				serverInfo.setServerInfo(server);
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
	
	pluginio.on('lagmeter', panel.onLagmeter);
	
	pluginio.on('plugins', panel.onPlugins);
	
	pluginio.on('server', panel.onServer);
	
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
		},
		
		getItemIcon: function(type, durability) {
			var img = $('<img width="32" height="32"/>');
			img.error(function() {
				img.unbind('error');
				img.attr('src', 'http://www.minecraftdatavalues.com/images/'+(type < 256 ? '1' : '2')+'/'+type+'_'+durability+'.png');
			});
			img.attr('src', 'http://www.minecraftdatavalues.com/images/'+(type < 256 ? '1' : '2')+'/'+type+'.png');
			return img;
		}
	}
})();