srcjs.plugins.mc_jsonapi.playerview = (function() {
	var commandCallback;
	
	var getItem = function(data) {
		if (data !== null) {
			item = srcjs.plugins.mc_jsonapi.items.getFullIcon(data.type,
					data.durability, data.amount);

		} else {
			item = $('<img src="clear.gif" width="32" height="32"/>');
			
		}
		return item;
	};
	
	var openItem = function(name, item, slot, callback) {
		var panel = srcjs.ui.SplitPanel();
		
		if (item === null) {
			item = {
				type: 0,
				durability: 0,
				amount: 0
			};
		}
		
		var left = $('<div/>');
		var preview = srcjs.plugins.mc_jsonapi.items.getFullIcon(item.type, item.durability, item.amount);
		left.append(preview);
		panel.append(left);
		
		var right = srcjs.ui.Table({title: 'Item data', className: 'srcjsPanelBody'});
		
		var inputAmount = $('<input type="number" min="0" max="64"/>').val(item.amount);
		var onChangeAmount = function() {
			var amount = parseInt(inputAmount.val());
			if (!isNaN(amount)) {
				preview.data('setAmount')(amount);
			}
		};
		inputAmount.change(onChangeAmount);
		inputAmount.keyup(onChangeAmount);
		inputAmount.mouseup(onChangeAmount);
		right.addRow($('<label>').text('Amount:'), inputAmount);
		
		var inputType = $('<input type="number" min="0" max="512"/>').val(item.type);
		var onChangeType = function() {
			var type = parseInt(inputType.val());
			if (!isNaN(type)) {
				preview.data('setType')(type, item.durability);
			}
		};
		inputType.change(onChangeType);
		inputType.keyup(onChangeType);
		inputType.mouseup(onChangeType);
		/*labelType.append($('<button/>').click(function() {
			
		}).append('<span class="srcjsIcon srcjsIconFind"/>'));*/
		right.addRow($('<label>').text('Type: '), inputType);
		
		panel.append(right.panel);
		
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
								if (!err && result && typeof callback == 'function') {
									callback(slot, type, item.durability, amount);
								}
								dlg.dialog("destroy");
							});
						}
					}
				},
				"Cancel": function() {
					$(this).dialog("destroy");
				}
			},
			width: 460
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
			var item;
			var getClickHandler = function(name, item, slot) {
				return function() {
					openItem(name, item, slot, function(slot, type, durability, amount) {
						var data = null
						if (type != 0 && amount != 0) {
							data = {
								type: type,
								durability: durability,
								amount: amount
							};
						}
						item = getItem(data);

						item.css({cursor: 'pointer'});
						item.click(getClickHandler(name, data, slot));
						inventory.setCell(Math.floor(slot / 9), slot % 9, item);
					});
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
				
				item = getItem(data.inventory.inventory[i]);
				
				item.css({cursor: 'pointer'});
				item.click(getClickHandler(data.name, data.inventory.inventory[i], i));
				row.push(item);
			}
			inventory.addRow(row);
		}
	};
})();

