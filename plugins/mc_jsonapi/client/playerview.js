srcjs.plugins.mc_jsonapi.playerview = (function() {
	var commandCallback;
	
	var openItem = function(name, item, slot) {
		var panel = srcjs.ui.SplitPanel();
		
		var left = $('<div/>');
		var preview = srcjs.plugins.mc_jsonapi.items.getFullIcon(item.type, item.durability, item.amount);
		left.append(preview);
		panel.append(left);
		
		var right = $('<div/>');
		
		var inputAmount = $('<input type="number" min="1" max="64"/>').val(item.amount);
		var onChangeAmount = function() {
			var amount = parseInt(inputAmount.val());
			if (!isNaN(amount)) {
				preview.data('setAmount')(amount);
			}
		};
		inputAmount.change(onChangeAmount);
		inputAmount.keyup(onChangeAmount);
		inputAmount.mouseup(onChangeAmount);
		right.append($('<label>').text('Amount: ').append(inputAmount));
		
		var inputType = $('<input type="number" min="1" max="512"/>').val(item.type);
		var onChangeType = function() {
			var type = parseInt(inputType.val());
			if (!isNaN(type)) {
				preview.data('setType')(type, item.durability);
			}
		};
		inputType.change(onChangeType);
		inputType.keyup(onChangeType);
		inputType.mouseup(onChangeType);
		var labelType = $('<label>').text('Type: ').append(inputType);
		labelType.append($('<button/>').click(function() {
			
		}).append('<span class="srcjsIcon srcjsIconFind"/>'));
		right.append(labelType);
		
		panel.append(right);
		
		srcjs.ui.Dialog({
			panel: panel.panel,
			buttons: {
				"Set": function() {
					var dlg = $(this);
					var amount = parseInt(inputAmount.val());
					if (!isNaN(amount)) {
						var type = parseInt(inputType.val());
						if (!isNaN(type)) {
							commandCallback('setPlayerInventorySlotWithDamage', [name, slot, type, item.durability, amount], function(err, result) {
								console.log(err, result);
								dlg.dialog("destroy");
							});
						}
					}
				},
				"Cancel": function() {
					$(this).dialog("destroy");
				}
			} 
		});
	};
	
	
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
	
	
	
	return {
		panel: function(playername, otherPlayers, newCommandCallback) {
			commandCallback = newCommandCallback;
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
			var getClickHandler = function(name, item, slot) {
				return function() {
					openItem(name, item, slot);
				};
			};
			if (data === null) {
				return;
			}
			var row = null;
			for(var i = 0; i < data.inventory.inventory.length; i++) {
				if (i % 9 == 0) {
					if (row) {
						inventory.addRow(row);
					}
					row = [];
				}
				
				if (data.inventory.inventory[i] !== null) {
					var item = srcjs.plugins.mc_jsonapi.items.getFullIcon(data.inventory.inventory[i].type,
							data.inventory.inventory[i].durability, data.inventory.inventory[i].amount);
					item.css({cursor: 'pointer'});
					row.push(item);

					item.click(getClickHandler(data.name, data.inventory.inventory[i], i));
				} else {
					row.push($('<img src="clear.gif" width="32" height="32"/>'));
				}
			}
			inventory.addRow(row);
		}
	};
})();

