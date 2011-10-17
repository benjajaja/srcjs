srcjs.plugins.mc_jsonapi.playerview = (function() {
	var panel = $('<div/>');
	
	var splitTop = srcjs.ui.SplitPanel();
	var pnlSkin = $('<div/>');
	splitTop.append(pnlSkin);
	
	var pnlPlayerOps = $('<div/>');
	
	var inputTeleportToPlayer = $('<select/>');
	pnlPlayerOps.append(inputTeleportToPlayer);
	splitTop.append(pnlPlayerOps);
	
	var btnTeleport = $('<button>Teleport</button>');
	pnlPlayerOps.append(btnTeleport);
	
	panel.append(splitTop.panel);
	
	var inventory = $('<table class="srcjsInventory"/>');
	panel.append(inventory);
	
	return {
		panel: function(playername, otherPlayers, commandCallback) {
			
			pnlSkin.html(srcjs.plugins.mc_jsonapi.minecraftskin.panel(playername));
			
			inputTeleportToPlayer.html('');
			btnTeleport.unbind('click');
			if (otherPlayers.length > 1) {
				$(otherPlayers).each(function(i, player) {
					if (player != playername) {
						inputTeleportToPlayer.append('<option value="'+i+'">'+player+'</option>');
					}
				});
				btnTeleport.click(function() {
					var dlg = $('<div>Teleport '+srcjs.escape(playername)+' to '+srcjs.escape(otherPlayers[inputTeleportToPlayer.val()])+'?</div>');
					
					dlg.dialog({
						autoOpen: true,
						buttons: {
							"Yes": function() {
								commandCallback('teleport', [playername, otherPlayers[inputTeleportToPlayer.val()]]);
								$(this).dialog("close");
							},
							"No": function() {
								$(this).dialog("close");
							}
						}
					});
				});
			} else {
				inputTeleportToPlayer.append('<option value="-1">No more players</option>');
			}
			
			//$.combobox.instances[0].setSelectOptions(otherPlayers);
			
			inventory.html('');
			
			
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
