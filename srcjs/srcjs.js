module.exports = function(app, options) {
	var io = require('socket.io').listen(app);
	var cp = require('child_process');
	var fs = require('fs');
	var unixlib = require('unixlib');
	
	var warnings = {
		runningUnattached: 'Server appears to be running, but is unattached to process - possibly because srcjs has been restarted or crashed.\n\
PLEASE STOP AND RESTART SERVER TO REGAIN INPUT AND OUTPUT CONTROL.\n\
(If you don\'t restart, the game server will continue running, but you will not be able to send commands or see output)',
		incorrectLogin: 'Incorrect username or password',
	};

	var proc = null;
	var procInterval = null;
	var sockets = [];

	var Status = makeEnum(['STOPPED', 'STARTED']);

	io.configure(function() {
		io.set('log level', 1);
	});
	
	io.sockets.on('connection', function (socket) {
		socket.emit('connected');
		socket.on('login', function(data, cb) {
			unixlib.pamauth('system-auth', data.username, data.password, function(result) {
				if (!result) {
					cb(warnings.incorrectLogin);
				} else {					
					getStatus(function(status, isUnattached) {
						sockets.push(socket);
						cb(false, status);
						if (isUnattached) {
							socket.emit('warn', warnings.runningUnattached);
						}
					});
					
					socket.on('start', function () {
						start(options.process, options.pidFilename, function() {
							socket.emit('started');
						});
					});
					socket.on('stop', function () {
						stop();
					});
					socket.on('input', function (string) {
						input(string);
					});
					socket.on('disconnect', function () {
						sockets.splice(sockets.indexOf(socket), 1);
					});
				}
			});
		});
		
	});



	var getStatus = function(cb) {
		if (proc === null) {
			fs.readFile(options.pidFilename, function(err, pid) {
				if (err) {
					console.log('cannot open '+options.pidFilename+' or does no exist');
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
		for(var i = 0, ilen = sockets.length; i < ilen; i++) {
			sockets[i].volatile.emit(channel, data);
		}
	};

	var onProcExit = function(code) {
		for(var i = 0, ilen = sockets.length; i < ilen; i++) {
			sockets[i].emit('exit', code);
		}
		proc = null;
		clearInterval(procInterval);
		procInterval = null;
	};

	var start = function(options, pidFilename, cb) {
		proc = cp.spawn(options.command,
				options.arguments,
				{
					setsid: options.setsid?true:false,
					cwd: options.chdir
				});
		procInterval = setInterval(function() {
			input('');
		}, options.ioInterval);
		console.log('process spawned');
		
		proc.stdout.on('data', function(data) {
			onProcData(data.toString(), 'stdout');
		});
		proc.stderr.on('data', function(data) {
			onProcData(data.toString(), 'stderr');
		});
		
		proc.stdout.on('end', function() {
			console.log('proc stdout end');
		});
		proc.stdout.on('error', function(exception) {
			console.log('proc stdout error', exception);
		});
		proc.stdout.on('close', function() {
			console.log('proc stdout close');
		});
		proc.stderr.on('end', function() {
			console.log('proc stderr end');
		});
		proc.stderr.on('error', function(exception) {
			console.log('proc stderr error', exception);
		});
		proc.stderr.on('close', function() {
			console.log('proc stderr close');
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
		var kill = function(pid) {
			cp.exec('kill -0 '+pid, function (error, stdout, stderr) {
				if (!error) {
					cp.exec('pkill -TERM -P '+pid, function (error, stdout, stderr) {
						if (!error) {
							cp.exec('kill -9 '+pid, function (error, stdout, stderr) {
								if (!error) {
									onProcExit(0);
									console.log('killed process '+pid);
								} else {
									console.log('killed child processes, but cannot kill process '+pid);
								}
							});
						} else {
							console.log('cannot kill process '+pid);
						}
					});
				} else {
					console.log('cannot ping process '+pid);
				}
			});
		};
	
		if (proc !== null) {
			kill(proc.pid);
		} else {
			fs.readFile(options.pidFilename, function(err, pid) {
				kill(pid.toString());
			});
		};
		
	};

	var input = function(string) {
		if (proc !== null) {
			proc.stdin.write(string+'\n');
		}
	};

	function makeEnum(array) {
		var p_enum = {};
		for(var i = 0; i < array.length; i++) {
			p_enum[array[i]] = array[i];
		}
		return p_enum;
	};
};

