var fs = require('fs');
var cp = require('child_process');
var start = require('./start');
var stop = require('./stop');
var plugins = require('./plugins');
var unixlib = require('unixlib');
var socketio = require('socket.io');

// these here are global, so we can reload them easily without having to cancel callbacks etc:
var options, configFilename;

var Status = makeEnum(['STOPPED', 'STARTED']);
var Channels = makeEnum(['WARN', 'STDOUT', 'STDERR', 'SYSTEM']);

// makes a nice java-like enum, with properties resolving to their own names (to print them, for example)
function makeEnum(array) {
	// enum is a reserved word (in browser environments)
	var p_enum = {};
	for(var i = 0; i < array.length; i++) {
		p_enum[array[i]] = array[i];
	}
	return p_enum;
};

var getStatus = function(proc, filename, cb) {
	if (proc === null) {
		fs.readFile(filename, function(err, pid) {
			if (err) {
				cb(Status.STOPPED);
			} else {
				// signal zero tests if process is running
				cp.exec('kill -0 '+pid, function (error, stdout, stderr) {
					if (error) {
						cb(Status.STOPPED);
					} else {
						cb(Status.STARTED, true);
					}
				});
			}
		});
		
	} else {
		cb(Status.STARTED);
	}
};

var loadPlugins = function(proc, pluginEventBus, app, io, socket, cb) {
	plugins.load(options.plugins, pluginEventBus, app, io, options.plugin, function(plugins) {
		getStatus(proc, options.pidFilename, function(status, isUnattached) {
			// this is a bit fuzzy. "socket" and "cb" are optional, called when reloading plugins.
			if (socket) {
				pluginEventBus.emit('connection', true);
			}
			if (status == Status.STARTED) {
				pluginEventBus.emit('procstart', isUnattached);
			} else {
				pluginEventBus.emit('procstop');
			}
			console.log('plugins loaded');
			if (cb) {
				cb();
			}
		});
	});
};

var unloadPlugins = function(pluginEventBus, socket) {
	plugins.unload(pluginEventBus, function() {
		socket.emit('unload', 'plugins');
	});
	
};

var srcjsStart = function(app, username) {
	var io = socketio.listen(app);
	
	var warnings = {
		runningUnattached: 'Server appears to be running, but is unattached to process - possibly because srcjs has been restarted or crashed.\n\
PLEASE STOP AND RESTART SERVER TO REGAIN INPUT AND OUTPUT CONTROL.\n\
(If you don\'t restart, the game server will continue running, but you will not be able to send commands or see output)',
		incorrectLogin: 'Incorrect username or password',
		sigHUPExecuted: 'Configuration reloaded, restart server if you changed command or arguments',
		uncaughtException: 'WARNING: an uncaught exception ocurred',
		stopError: 'WARNING: an error ocurred when performing "stop" commands.',
	};

	var proc = null;
	var procInterval = null;
	var userCount = 0;
	
	var onProcData = function(data, channel) {
		io.of('/console').volatile.emit(channel.toLowerCase() /* türk i? */, data);
	};

	io.configure(function() {
		io.set('log level', 1);
	});
	
	process.on('uncaughtException', function(err) {
		try {
			console.error('UNCAUGHT EXCEPTION', err.message, err.stack);
			onProcData(warnings.uncaughtException+': '+err.message, Channels.WARN);
		} catch (e) {}
	});
	
	io.of('/console').on('connection', function (socket) {
		socket.emit('connected');
		socket.on('login', function(data, cb) {
			if (data.username != username) {
				cb(warnings.incorrectLogin);
				console.log('username "'+data.username+'" doesn\'t even match '+username, data.username != username, data.username, username);
				
			} else {
				// obviously won't work on windows. do we really expect someone to run this on windows?
				unixlib.pamauth('system-auth', data.username, data.password, function(result) {
					if (!result) {
						cb(warnings.incorrectLogin);
					} else {
						pluginEventBus.emit('userjoin', socket);
						if (userCount == 0) {
							pluginEventBus.emit('connection', true);
						}
						userCount++;
						
						
						getStatus(proc, options.pidFilename, function(status, isUnattached) {
							cb(false, status);
							if (isUnattached) {
								socket.emit('warn', warnings.runningUnattached);
							}
						});
						
						socket.on('start', function () {
							start(options.process, options.pidFilename,
								function(data) {
									onProcData(data.toString(), Channels.STDOUT);
								},
								function(data) {
									onProcData(data.toString(), Channels.STDERR);
								},
								onProcExit,
								function(err, newProc) {
									if (err) throw err;
									proc = newProc;
									if (options.process.ioInterval > 0) {
										setProcInputInterval(options.process.ioInterval);
									}
									io.of('/console').emit('started');
									pluginEventBus.emit('procstart');
								}
							);
						});
						socket.on('stop', function() {
							var manualOnProcExit = (proc === null);
							stop(proc, options, function(err, signal) {
								if (err) {
									io.of('/console').emit('warn', warnings.stopError);
								} else if (manualOnProcExit) {
									onProcExit(0, signal);
								}
							});
						});
						socket.on('input', input);
						socket.on('HUP', function() {
							HUP(socket, function() {
								socket.emit('warn', warnings.sigHUPExecuted);
							});
						});
						
						socket.on('disconnect', function () {
							userCount--;
							if (userCount <= 0) {
								userCount = 0;
								pluginEventBus.emit('connection', false);
							}
						});
					}
				});
			}
		});
	});

	

	
	var pluginEventBus = require('./eventbus')();

	loadPlugins(proc, pluginEventBus, app, io);
	
	



	var onProcExit = function(code, signal) {
		io.of('/console').emit('exit', {code: code, signal: signal});
		if (proc !== null) {
			proc.removeAllListeners('exit');
			proc.stdout.removeAllListeners('data');
			proc.stderr.removeAllListeners('data');
			proc = null;
		}
		clearProcInterval();
		pluginEventBus.emit('procstop');
	};
	
	var setProcInputInterval = function(interval) {
		// if we don't send anything to proc's stdin, it seems to stop producing
		// stdout (at least with source games)
		if (proc !== null) {
			procInterval = setInterval(function() {
				if (!input('')) {
					clearInterval(procInterval);
					procInterval = null;
				}
			}, interval);
		}
	};
	
	var clearProcInterval = function() {
		if (procInterval !== null) {
			clearInterval(procInterval);
			console.log('clearProcInterval(): procInterval after clearInterval is:', procInterval);
			procInterval = null; // is this necessary? check console for line above
		}
	};



	var input = function(string) {
		if (proc !== null) {
			try {
				proc.stdin.write(string+'\n');
				return true;
			} catch (e) {
				console.error('proc not null but stdin socket not writable!');
				return false;
			}
		}
		return false;
	};
	
	/*
	 * "Hangup" command should reload config AND plugins on the fly
	 */
	var HUP = function(socket, cb) {
		readOptions(configFilename, function() {
			if (options.process.ioInterval > 0) {
				setProcInputInterval(options.process.ioInterval);
			} else if (proc !== null) {
				clearProcInterval();
			}
			
			var onUnloaded = function() {
				socket.removeListener('unloaded', onUnloaded);
				loadPlugins(proc, pluginEventBus, app, io, socket, cb);
			};
			socket.on('unloaded', onUnloaded);
			unloadPlugins(pluginEventBus, socket);
		});
	};


	
};

// read config file
var readOptions = function(filename, cb) {
	fs.readFile(filename, function(err, data) {
	if (err) throw err;

		options = JSON.parse(data.toString())
		cb();
	});
};

module.exports = function(filename, cb) {
	configFilename = filename;
	readOptions(configFilename, function() {
		cb(options.port);
	});
	return {
		start: function(app) {
			// get username of script (process.getUid only gets id)
			require('child_process').exec('id -un', function(err, stdout, stderr) {
				if (err) throw err;
				
				srcjsStart(app, stdout.replace(/\n/, ''));
			});
		}
	};
};