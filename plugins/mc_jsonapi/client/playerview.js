srcjs.plugins.mc_jsonapi.playerview = (function() {
	var panel = $('<div/>');
	
	var splitTop = srcjs.ui.SplitPanel();
	var pnlSkin = $('<div/>');
	splitTop.append(pnlSkin);
	
	var pnlPlayerOps = srcjs.ui.Table({
		title: 'Player actions'
	});
	
	var inputTeleportToPlayer = $('<select/>');
	var btnTeleport = $('<button>Teleport</button>');
	pnlPlayerOps.addRow([inputTeleportToPlayer, btnTeleport]);
	
	var inputKickPlayer = $('<input placeholder="reason"/>');
	var btnKick = $('<button>Kick</button>');
	pnlPlayerOps.addRow([inputKickPlayer, btnKick]);
	
	var btnBan = $('<button>Ban</button>');
	pnlPlayerOps.addRow([null, btnBan]);
	
	var inputSay = $('<input placeholder="say as player"/>');
	var btnSay = $('<button>Say</button>');
	inputSay.keyup(function(e) {
		if (e.which == 13) { // enter
			btnSay.click();
		};
	});
	pnlPlayerOps.addRow([inputSay, btnSay]);
	
	splitTop.append(pnlPlayerOps.panel);
	
	
	
	panel.append(splitTop.panel);
	
	var inventory = srcjs.ui.Table({
		title: 'Inventory'
	});
	panel.append(inventory.panel);
	
	function getDurabilityPercent(type, durability) {
		var max = null;
		switch(type) {
			case 276: // diamond
			case 277:
			case 278:
			case 279:
			case 293: max = 1562;
		break;
			case 256: // iron
			case 257:
			case 258:
			case 267:
			case 292: max = 251;
		break;
			case 272: // stone
			case 273:
			case 274:
			case 275:
			case 291: max = 132;
		break;
			case 268: // wood
			case 269:
			case 270:
			case 271:
			case 290: max = 60;
		break;
			case 283: // gold
			case 284:
			case 285:
			case 286:
			case 294: max = 33;
		break;
			
		}
		if (max === null) {
			return null;
		} else {
			return (100 * (max - durability) / max).toFixed(2);
		}
	}
	
	return {
		panel: function(playername, otherPlayers, commandCallback) {
			
			pnlSkin.html(srcjs.plugins.mc_jsonapi.minecraftskin.panel(playername));
			
			inputTeleportToPlayer.html('');
			$([btnTeleport, btnKick]).unbind('click');
			
			if (otherPlayers.length > 1) {
				$(otherPlayers).each(function(i, player) {
					if (player != playername) {
						inputTeleportToPlayer.append('<option value="'+i+'">'+player+'</option>');
					}
				});
				btnTeleport.click(function() {
					srcjs.ui.DialogConfirm({
						message: 'Teleport '+playername+' to '+otherPlayers[inputTeleportToPlayer.val()]+'?',
						onYes: function() {
							commandCallback('teleport', [playername, otherPlayers[inputTeleportToPlayer.val()]]);
						}
					});
				});
			} else {
				inputTeleportToPlayer.append('<option value="-1">No more players</option>');
			}
			
			btnKick.click(function() {
				srcjs.ui.DialogConfirm({
					message: 'Really kick '+playername+' with reason "'+(inputKickPlayer.val() ? inputKickPlayer.val() : '(no reason)')+'"?',
					onYes: function() {
						commandCallback('kickPlayer', [playername, inputKickPlayer.val()]);
						inputKickPlayer.val('');
					}
				});
			});
			
			btnBan.click(function() {
				srcjs.ui.DialogConfirm({
					message: 'Really ban '+playername+'?',
					onYes: function() {
						commandCallback('ban', [playername]);
					}
				});
			});
			
			btnSay.click(function() {
				srcjs.ui.DialogConfirm({
					message: 'Really say "'+inputSay.val()+'" as if '+playername+' would have said it to chat?',
					onYes: function() {
						commandCallback('broadcastWithName', [inputSay.val(), playername], function(err, result) {
							if (err || result !== true) {
								console.log('broadcastWithName error', err, result);
								//srcjs.ui.DialogError({me
							}
						});
						inputSay.val('');
					}
				});
			});
			
			
			inventory.clear();
			
			
			return panel;
		},
		
		setPlayerData: function(data) {
			if (data === null) {
				return;
			}
			var row;
			for(var i = 0; i < data.inventory.inventory.length; i++) {
				if (i % 9 == 0) {
					if (row) {
						inventory.addRow(row);
					}
					row = [];
				}
				
				if (data.inventory.inventory[i] !== null) {
					var item = $('<span class="srcjsItem"/>');
					item.append(srcjs.plugins.mc_jsonapi.getItemIcon(data.inventory.inventory[i].type, data.inventory.inventory[i].durability));
					if (data.inventory.inventory[i].type > 255 && data.inventory.inventory[i].durability > 0) {
						var percent = getDurabilityPercent(data.inventory.inventory[i].type, data.inventory.inventory[i].durability);
						if (percent !== null) {
							item.append('<span class="srjcsItemDurability"><span class="srjcsItemDurabilityMeter" title="'+data.inventory.inventory[i].durability+'" style="width: '+percent+'%"/></span>');
						}
					}
					if (data.inventory.inventory[i].amount > 1) {
						item.append('<span class="srjcsItemAmount">'+data.inventory.inventory[i].amount+'</span>');
					}
					row.push(item);
				} else {
					row.push($('<img src="clear.gif" width="32" height="32"/>'));
				}
			}
			inventory.addRow(row);
		}
	};
})();
