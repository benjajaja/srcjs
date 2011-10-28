srcjs.plugins.mc_jsonapi.items = (function() {
	var o = {
		getItemIcon: function(type, durability) {
			var img = $('<img width="32" height="32"/>');
			img.error(function() {
				img.unbind('error');
				img.attr('src', 'http://www.minecraftdatavalues.com/images/'+(type < 256 ? '1' : '2')+'/'+type+'_'+durability+'.png');
			});
			img.attr('src', 'http://www.minecraftdatavalues.com/images/'+(type < 256 ? '1' : '2')+'/'+type+'.png');
			return img;
		},
		
		getDurabilityPercent: function(type, durability) {
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
		},
		
		getFullIcon: function(type, durability, amount) {
			var item = $('<span class="srcjsItem"/>');
			var icon = srcjs.plugins.mc_jsonapi.items.getItemIcon(type, durability);
			var elAmount = null;
			item.append(icon);
			if (type > 255 && durability > 0) {
				var percent = srcjs.plugins.mc_jsonapi.items.getDurabilityPercent(
						type, durability);
				if (percent !== null) {
					item.append('<span class="srjcsItemDurability"><span class="srjcsItemDurabilityMeter" title="'+durability+'" style="width: '+percent+'%"/></span>');
				}
			}
			
			if (amount > 1) {
				elAmount = $('<span class="srjcsItemAmount">'+amount+'</span>');
				item.append(elAmount);
			}
			item.data('setType', function(type, durability) {
				var newIcon = srcjs.plugins.mc_jsonapi.items.getItemIcon(type, durability);
				icon.replaceWith(newIcon);
				icon = newIcon;
			});
			item.data('setAmount', function(amount) {
				if (elAmount === null) {
					elAmount = $('<span class="srjcsItemAmount">'+amount+'</span>');
					item.append(elAmount);
				} else {
					var newElAmount = $('<span class="srjcsItemAmount">'+amount+'</span>');
					elAmount.replaceWith(newElAmount);
					elAmount = newElAmount;
				}
			});
			return item;
		}
	};
	return o;
})();