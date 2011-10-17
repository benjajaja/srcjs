var fs = require('fs');
var cp = require('child_process');

// TODO: somehow identify process and kill forcefully, even if not running or proc with given pid not found.
// let config.json define how to identofy the process (nightmarish?)

// always kill proc hierarchy
var kill = function(pid, signal, isWindows, cb) {
	// is it running?
	if (!isWindows) {
		cp.exec('kill -0 '+pid, function (error, stdout, stderr) {
			if (!error) {
				// kill process hierarchy by parent pid (kills childs)
				cp.exec('pkill -'+signal+' -P '+pid, function (error, stdout, stderr) {
					if (!error) {
						console.log('cannot pkill -P #'+pid);
					}
					// now kill the original process
					cp.exec('kill -'+signal+' '+pid, function (error, stdout, stderr) {
						if (!error) {
							cb(null, signal);
						} else {
							cb('cannot kill process '+pid);
							console.log('cannot pkill -P #'+pid, error);
						}
					});
					
				});
			} else {
				// not running
				// TODO: remove pidfile
				console.log('cannot ping process #'+pid+': is not running');
				cb(null, 0);
			}
		});
	} else {
		cp.exec('taskkill /F /PID '+pid, function (error, stdout, stderr) {
			if (!error) {
				cb();
			} else {
				cb('cannot kill process '+pid);
				console.log('cannot taskkill /PID '+pid, error);
			}
		});
	}
};

var executeStopStep = function(proc, stop, filename, isWindows, cb) {
	if (stop.input) {
		if (proc !== null) {
			try {
				proc.stdin.write(stop.input+'\n');
				cb();
			} catch (e) {
				console.log('proc not null but stdin not writable');
				cb();
			}
		} else {
			cb();
		}
	} else if (stop.signal) {
		if (proc !== null) {
			kill(proc.pid, stop.signal, isWindows, cb);
			
		} else {
			fs.readFile(filename, function(err, pid) {
				kill(pid.toString(), stop.signal, isWindows, cb);
			});
		}
	}
};

var stop = function(proc, options, cb) {
	var index = 0, timeout = null;
	
	if (proc !== null) {
		// do not process stop steps further if it suddenly exits (by internal "quit" command, for instance)
		proc.on('exit', function() {
			if (timeout !== null) {
				clearTimeout(timeout);
				timeout = null;
			}
			index = options.process.stop.length;
		});
	}
	
	var runStopStep = function() {
		// notice that we only executeStopStep's error to callback if it's the last step (only kill can err)
		if (options.process.stop[index].timeout) {
			timeout = setTimeout(function() {
				executeStopStep(proc, options.process.stop[index], options.pidFilename, options.isWindows, function(err, signal) {
					timeout = null;
					if (index < options.process.stop.length - 1) {
						index++;
						runStopStep();
					} else {
						cb(err, signal);
					}
				});
			}, options.process.stop[index].timeout);
		} else {
			executeStopStep(proc, options.process.stop[index], options.pidFilename, options.isWindows, function(err, signal) {
				if (index < options.process.stop.length - 1) {
					index++;
					runStopStep();
				} else {
					cb(err, signal);
				}
			});
		}
	};

	try {
		runStopStep();
	} catch (e) {
		console.log('exception on stop():', e);
		cb(e);
	}
};

module.exports = stop;