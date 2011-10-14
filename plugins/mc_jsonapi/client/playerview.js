(function() {
	var load = function() {
		if (typeof srcjs.plugins.mc_jsonapi != 'undefined') {
			srcjs.plugins.mc_jsonapi.playerview = (function() {
				var panel = $('<div/>');
				
				var inventory = $('<table class="srcjsInventory"/>');
				
				return {
					panel: function(playername) {
						panel.html('');
						panel.append(srcjs.plugins.mc_jsonapi.minecraftskin.panel(playername));
						
						inventory.html('');
						panel.append(inventory);
						
						return panel;
					},
					
					setPlayerData: function(data) {
						console.log(data);
						var row;
						for(var i = 0; i < data.inventory.inventory.length; i++) {
							if (i % 9 == 0) {
								row = $('<tr/>');
								inventory.append(row);
							}
							var cell = $('<td/>');
							if (data.inventory.inventory[i] !== null) {
								cell.append(srcjs.plugins.mc_jsonapi.getItemIcon(data.inventory.inventory[i].type, data.inventory.inventory[i].durability));
							} else {
								cell.html('<img src="clear.gif" width="32" height="32"/>');
							}
							row.append(cell);
						}
					}
				};
			})();
		} else {
			setTimeout(load, 100);
		}
	};
	load();
})();