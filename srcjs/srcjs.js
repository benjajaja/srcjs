var fs = require('fs');
var options, configFilename;

var start = function(app) {
	var io = require('socket.io').listen(app);
	var cp = require('child_process');
	
	var unixlib = require('unixlib');
	
	var warnings = {
		runningUnattached: 'Server appears to be running, but is unattached to process - possibly because srcjs has been restarted or crashed.\n\
PLEASE STOP AND RESTART SERVER TO REGAIN INPUT AND OUTPUT CONTROL.\n\
(If you don\'t restart, the game server will continue running, but you will not be able to send commands or see output)',
		incorrectLogin: 'Incorrect username or password',
		sigHUPExecuted: 'Configuration reloaded, restart server if you changed command or arguments',
		uncaughtException: 'WARNING: an uncaught exception ocurred.',
		stopError: 'WARNING: an error ocurred when performing "stop" commands.',
	};

	var proc = null;
	var procInterval = null;

	var Status = makeEnum(['STOPPED', 'STARTED']);

	io.configure(function() {
		io.set('log level', 1);
	});
	
	process.on('uncaughtException', function(err) {
		try {
			console.log('UNCAUGHT EXCEPTION', err);
			onProcData('warn', warnings.uncaughtException);
		} catch (e) {}
	});
	
	io.sockets.on('connection', function (socket) {
		socket.emit('connected');
		socket.on('login', function(data, cb) {
			unixlib.pamauth('system-auth', data.username, data.password, function(result) {
				if (!result) {
					cb(warnings.incorrectLogin);
				} else {
					getStatus(function(status, isUnattached) {
						socket.join('all');
						cb(false, status);
						if (isUnattached) {
							socket.emit('warn', warnings.runningUnattached);
						}
					});
					
					socket.on('start', function () {
						start(options.process, options.pidFilename, function() {
							io.sockets.in('all').volatile.emit('started');
						});
					});
					socket.on('stop', stop);
					socket.on('input', input);
					socket.on('HUP', function() {
						HUP(function() {
							socket.emit('warn', warnings.sigHUPExecuted);
						});
					});
					
					//socket.on('disconnect', function () {});
				}
			});
		});
	});



	var getStatus = function(cb) {
		if (proc === null) {
			fs.readFile(options.pidFilename, function(err, pid) {
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

	var onProcData = function(data, channel) {
		io.sockets.in('all').volatile.emit(channel, data);
	};

	var onProcExit = function(code) {
		io.sockets.in('all').volatile.emit('exit', code);
		if (proc !== null) {
			proc.removeAllListeners('exit');
			proc.stdout.removeAllListeners('data');
			proc.stderr.removeAllListeners('data');
			proc = null;
		}
		clearProcInterval();
	};
	
	var setProcInputInterval = function(interval) {
		// if we don't send anything to proc's stdin, it seems to stop producing
		// stdout (at least with source games)
		if (proc !== null) {
			procInterval = setInterval(function() {
				input('');
			}, interval);
		}
	};
	
	var clearProcInterval = function() {
		if (procInterval !== null) {
			clearInterval(procInterval);
			procInterval = null;
		}
	};

	var start = function(options, pidFilename, cb) {
		proc = cp.spawn(options.command,
				options.arguments,
				{
					setsid: options.setsid?true:false,
					cwd: options.chdir
				});
		
		if (options.ioInterval > 0) {
			setProcInputInterval(options.ioInterval);
		}
		console.log('process spawned');
		
		proc.stdout.on('data', function(data) {
			onProcData(data.toString(), 'stdout');
		});
		proc.stderr.on('data', function(data) {
			onProcData(data.toString(), 'stderr');
		});
		
		proc.on('exit', onProcExit);
		
		fs.writeFile(pidFilename, proc.pid.toString(), function(err) {
			if (err) {
				console.error('Cannot write pidfile ('+pidFilename+'):', err);
			}
		});
		
		cb();
	};

	var stop = function() {
		// always kill proc hierarchy
		var kill = function(pid, signal, cb) {
			// is it running?
			cp.exec('kill -0 '+pid, function (error, stdout, stderr) {
				if (!error) {
					// kill process hierarchy by parent pid (kills childs)
					cp.exec('pkill -'+signal+' -P '+pid, function (error, stdout, stderr) {
						if (!error) {
							// now kill the original process
							cp.exec('kill -'+signal+' '+pid, function (error, stdout, stderr) {
								if (!error) {
									onProcExit(0);
									console.log('killed process '+pid);
									cb();
								} else {
									console.log('killed child processes, but cannot kill process '+pid);
									cb();
								}
							});
						} else {
							console.log('cannot kill process '+pid);
							cb();
						}
					});
				} else {
					console.log('cannot ping process '+pid);
					cb();
				}
			});
		};
		var runStopFunction = function(stop, cb) {
			if (stop.input) {
				if (proc !== null) {
					input(stop.input);
					cb();
				} else {
					cb();
				}
			} else if (stop.signal) {
				if (proc !== null) {
					kill(proc.pid, stop.signal, cb);
					
				} else {
					fs.readFile(options.pidFilename, function(err, pid) {
						kill(pid.toString(), stop.signal, cb);
					});
				}
			}
		};
		
		var index = 0, timeout = null;
		var runStopStep = function() {
			console.log('running stop step', options.process.stop[index]);
			if (options.process.stop[index].timeout) {
				timeout = setTimeout(function() {
					runStopFunction(options.process.stop[index], function() {
						timeout = null;
						if (index < options.process.stop.length - 1) {
							index++;
							runStopStep();
						}
					});
				}, options.process.stop[index].timeout);
			} else {
				runStopFunction(options.process.stop[index], function() {
					if (index < options.process.stop.length - 1) {
						index++;
						runStopStep();
					}
				});
			}
		};
		if (proc) {
			// do not process stop steps further if suddenly exits (by internal "quit" command, for instance)
			proc.on('exit', function() {
				if (timeout !== null) {
					clearTimeout(timeout);
					timeout = null;
				}
				index = options.process.stop.length;
			});
		}
		try {
			runStopStep();
		} catch (e) {
			console.log('exception on stop():', e);
			onProcData('warn', warnings.stopError);
		}
		
	};

	var input = function(string) {
		if (proc !== null) {
			proc.stdin.write(string+'\n');
		}
	};
	
	var HUP = function(cb) {
		readOptions(configFilename, function() {
			if (options.process.ioInterval > 0) {
				setProcInputInterval(options.process.ioInterval);
			} else if (proc !== null) {
				clearProcInterval();
			}
			cb();
		});
	};

	function makeEnum(array) {
		// enum is a reserved word (in browser environments)
		var p_enum = {};
		for(var i = 0; i < array.length; i++) {
			p_enum[array[i]] = array[i];
		}
		return p_enum;
	};
	
};

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
		start: start
	};
};