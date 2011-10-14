/**
 * Some UI stuff like pretty boxes, lists, a console, dividing panels
 * By convention, inheritance with protected-like visibility is achieved with
 * closures and a "spec" parameter to constructor calls.
 * Said "spec" is optionally defined and accessed from a class that wishes to
 * expose a method only to sub-classes but not to the outside.
 * Any srcjs.ui.* constructor shoudl return an object with at least a method
 * "panel" which sould return the main widget/element, and in most cases, a
 * method "append".
 */
srcjs.ui = (function() {

	// private to all members of package
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
				var children = panel.children();
				window.console.log('SpitPanel: setting width of children: '+childWidth, children.length);
				
				
				children.each(function(i, child) {
					if (i < children.length) {
						$(child).css({
							width: (childWidth - 1)+'%',
							marginLeft: '1%'
						});
					} else {
						$(child).css({width: childWidth+'%'});
					}
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
		
		/**
		 * "Box" has a header and a footer with some nice css.
		 * There is a css class "srcjsPanelBody" which is suitable for elements
		 * that are appended to it.
		 */
		Box: function(options, spec) {
			spec = spec || {};
			spec.setTitle = spec.setTitle || function(title) {
				titleBar.text(title);
			};
			spec.setTitleButton = spec.setTitleButton || function(icon, handler, text) {
				text = text || titleBar.text();
				titleBar.html('');
				titleBar.append($('<a class="srcjsPanelTitleIcon srcjsPanelTitleIcon-'+icon+'"></a>').click(handler));
				if (text) {
					titleBar.append(text);
				}
			};
			var div = $('<div class="srcjsPanel srcjsRound"/>');
			if (options.classNames) {
				$(options.classNames).each(function(i, className) {
					div.addClass(className);
				});
			}
			if (options.css) {
				div.css(options.css);
			}
			
			var titleBar = $('<h3 class="srcjsRoundTop"/>');
			if (options.title) {
				titleBar.text(options.title);
			}
			div.append(titleBar);
			
			var footer = $('<h6 class="srcjsRoundBottom"/>');
			div.append(footer);
			
			var o = {};
			// protected methods:
			o.panel = spec.panel || function() {
				return div;
			};
			o.append = spec.append || function(element) {
				element.insertBefore(footer);
			};
			return o;
		},
		
		/**
		 * Simple readonly list of strings
		 */
		ListBox: function(options, spec) {
			spec = spec || {};
			// get inner content
			spec.getItem = spec.getItem || function(item, index) {
				return $('<span class="srcjsListBoxItem"/>').text(item);
			};
			// get <li> wrapper, with custom styles or events
			spec.getListItem = spec.getListItem || function(index) {
				return $('<li/>');
			};
			spec.list = $('<ul class="srcjsPanelBody srcjsListBox"/>');
			
			var box = srcjs.ui.Box(options, spec);
			
			
			if (spec.listBoxClassNames) {
				$(spec.listBoxClassNames).each(function(i, className) {
					spec.list.addClass(className);
				});
			}
			box.append(spec.list);
			
			// set items to list of strings
			box.set = function(items) {
				spec.list.html('');
				$(items).each(function(i, item) {
					var li = spec.getListItem(i);
					$(spec.getItem(item, i)).each(function(i, item) {
						li.append(item);
					});
					spec.list.append(li);
				});
			};
			
			return box;
		},
		
		/**
		 * Column-formatted readonly list, wih custom formatting callback
		 * options.formatColumns accepts index (to tell column) and a string parameter
		 * andmust return a new element.
		 */
		ListBoxFormatted: function(options, spec) {
			spec = spec || {};
			if (spec.listBoxClassNames) {
				spec.listBoxClassNames.push('srcjsListBoxFormatted');
			} else {
				spec.listBoxClassNames = ['srcjsListBoxFormatted'];
			}

			options.formatColumns = options.formatColumns || function(index, item, listIndex) {
				return item;
			};
			spec.getItem = spec.getItem || function(item, index) {
				var data = [];
				for(var i = 0; i < item.length; i++) {
					data[i] = $('<span class="srcjsListBoxItem"/>').append(options.formatColumns(i, item[i], index));
					
				}
				return data;
			};
			return srcjs.ui.ListBox(options, spec);
		},
		
		ListBoxLinksFormatted: function(options, spec) {
			spec = spec || {};
			if (spec.listBoxClassNames) {
				spec.listBoxClassNames.push('srcjsListBoxLinksFormatted');
			} else {
				spec.listBoxClassNames = ['srcjsListBoxLinksFormatted'];
			}
			spec.getListItem = spec.getListItem || function(index) {
				return $('<li/>').click(function() {
					list.openItem(index);
				});
			};
			
			var list = srcjs.ui.ListBoxFormatted(options, spec);
			
			list.openItem = function(index) {
				spec.list.detach();
				var onRemoveCallback = function() {
				};
				var body = $('<div class="srcjsPanelBody"/>');
				
				var view = options.getItemView(index);
				
				list.append(body.append(view.element));
				spec.setTitleButton('back', function() {
					spec.setTitle(options.title);
					if (view.onRemove) {
						view.onRemove(function() {
							body.remove();
							list.append(spec.list);
						});
					} else {
						body.remove();
						list.append(spec.list);
					}
				}, view.title);
			};
			return list;
		},
		
		
		/**
		 * Get a console in a box, ready with command history etc.
		 * inputListener will be called when enter is pressed on input; it must return boolean false if the input field
		 * should NOT be cleared
		 */
		Console: function(options, spec) {
			spec = spec || {};
			
			if (options.classNames) {
				options.classNames.push('srcjsConsole');
			} else {
				options.classNames = ['srcjsConsole'];
			}
			
			var box = srcjs.ui.Box(options, spec);

			/**
			 * Add a line of text, an element, or an array of elements
			 */
			box.addLines = function(data) {
				var div = $('<div/>');
				if (typeof data == 'string') {
					div.text(data);
				} else if (typeof data == 'object') {
					if (typeof data.length != 'undefined') {
						$(data).each(function(index, element) {
							div.append(element);
						});
					} else {
						div.append(data[i]);
					}
				} else {
					div.text(data.toString());
				}
				// limit scroll history
				if (lineDiv.children().size() > 1000) {
					lineDiv.children().filter(':lt(100)').remove();
				}
				lineDiv.append(div);
				lineDiv.scrollTop(lineDiv[0].scrollHeight);
			};
			
			
			height = typeof options.height != 'undefined' ? options.height : 100;
			height -= 30 + 10; // take off top and bottom bar - yes, this bad practice
			
			var lineDiv = $('<div class="srcjsConsoleLines"/>');
			box.append(lineDiv);
			
			// if no inputlistener, assume that console is read only
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
			
			return box;
		}
	};
	return ui;
})();