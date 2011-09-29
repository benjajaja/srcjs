var fs = require('fs');
var cp = require('child_process');

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
							cb(null, signal);
						} else {
							cb('killed child processes, but cannot kill process '+pid);
						}
					});
				} else {
					cb('cannot kill process '+pid);
				}
			});
		} else {
			// not running
			// TODO: remove pidfile
			console.log('cannot kill process #'+pid+': is not running');
			cb();
		}
	});
};

var executeStopStep = function(proc, stop, filename, cb) {
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
			kill(proc.pid, stop.signal, cb);
			
		} else {
			fs.readFile(filename, function(err, pid) {
				kill(pid.toString(), stop.signal, cb);
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
				executeStopStep(proc, options.process.stop[index], options.pidFilename, function(err, signal) {
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
			executeStopStep(proc, options.process.stop[index], options.pidFilename, function(err, signal) {
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