srcjs.ui = (function() {
	
		var TextboxHistory = function() {
		// notice importance of pre- and post-increment on "index" (it's for brevity)
		var history = [];
		var index = 0;
		var size = 0;
		var o = {
			push: function(command) {
				history[index++] = command;
				history.splice(index + 1);
				size++;
			},
			back: function(input) {
				if (index > 0) {
					input.val(history[--index]);
				}
			},
			forth: function(input) {
				if (typeof history[index + 1] != 'undefined') {
					input.val(history[++index]);
				} else {
					if (index < size) {
						index++;
					}
					input.val('');
				}
			},
			listen: function(input, listener) {
				input.keyup(function(e) {
					if (e.which == 13) { // enter
						if (listener(input.val())) {
							input.val('');
						}
					} else if (e.which == 38) {
						o.back(input);
					} else if (e.which == 40) {
						o.forth(input);
					}
				});
			}
		};
		return o;
	};
	
	var ui = {
	
		SplitPanel: function() {
			var panel = $('<div class="srcjsSplitPanel"/>');
			
			var setWidths = function() {
				var childWidth = Math.floor(100 / panel.children().length);
				window.console.log('SpitPanel: setting width of children: '+childWidth);
				
				panel.children().each(function(i, child) {
					$(child).css({width: childWidth+'%'});
				});
			};
			
			var o = {
				panel: panel,
				append: function(element) {
					panel.append(element);
					setWidths();
				},
			};
			return o;
		},
		
		Box: function(options) {
			var div = $('<div class="srcjsPanel srcjsRound"/>');
			if (options.classNames) {
				$(options.classNames).each(function(i, className) {
					div.addClass(className);
				});
			}
			
			var titleBar = $('<h3 class="srcjsRoundTop"/>');
			if (options.title) {
				titleBar.text(options.title);
			}
			div.append(titleBar);
			
			var footer = $('<h6 class="srcjsRoundBottom"/>');
			div.append(footer);
			
			return {
				panel: function() {
					return div;
				},
				
				append: function(element) {
					element.insertBefore(footer);
				}
			};
		},
		
		/*
		 * Get a console in a box, ready with command history etc.
		 * inputListener will be called when enter is pressed on input; it must return boolean false if the input field
		 * should NOT be cleared
		 */
		Console: function(options) {
			if (options.classNames) {
				options.classNames.push('srcjsConsole');
			} else {
				options.classNames = ['srcjsConsole'];
			}
			
			var box = srcjs.ui.Box(options);
			height = typeof options.height != 'undefined' ? options.height : 100;
			height -= 30 + 10; // take off top and bottom bar
			
			var lineDiv = $('<div class="srcjsConsoleLines"/>');
			box.append(lineDiv);
			
			if (options.inputListener) {
				var inputDiv = $('<div class="srcjConsoleInput"/>');
				
				var btn = $('<button class="srcjsInputButton"/>');
				btn.append('<img src="clear.gif" class="srcjsIcon srcjsIconInput"/>');
				inputDiv.append(btn);
				
				var wrapper = $('<div class="srcjsInputWrapper"/>');
				var input = $('<input type="text" autocomplete="false" class="srcjsConsoleInput"/>');
				wrapper.append(input);
				inputDiv.append(wrapper);
				
				input.keyup(function(e) {
					if (e.which == 13) { // enter
						if (options.inputListener(input.val()) !== false) {
							input.val('');
						}
					} else if (e.which == 38) { // up
						history.back(input);
					} else if (e.which == 40) { // down
						history.forth(input);
					}
				});
				
				box.append(inputDiv);
				var history = TextboxHistory();
				history.listen(lineDiv, options.inputListener);
				
				
				height -= 30; // take off input height
			}
			
			lineDiv.css({height: height+'px'});
			
			/*
			 * Add a line of text, an element, or an array of elements
			 */
			box.append = function(data) {
				var div = $('<div/>');
				if (typeof data == 'string') {
					div.text(data);
				} else if (typeof data == 'object') {
					if (typeof data.length != 'undefined') {
						for(var i = 0; i < data.length; i++) {
							div.append(data[i]);
						}
					} else {
						div.append(data[i]);
					}
				} else {
					div.text(data.toString());
				}
				if (lineDiv.children().size() > 1000) {
					lineDiv.children().filter(':lt(100)').remove();
				}
				lineDiv.append(div);
				lineDiv.scrollTop(lineDiv[0].scrollHeight);
			};
			/*
			 * Add a line of text
			 */
			box.text = box.append;
			return box;
		}
	};
	return ui;
})();