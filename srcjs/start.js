var fs = require('fs');
var cp = require('child_process');

var start = function(options, pidFilename, stdoutCb, stderrCb, exitCb, cb) {
	var proc = cp.spawn(options.command,
			options.arguments,
			{
				setsid: options.setsid?true:false,
				cwd: options.chdir
			});
	
	if (proc) {
		proc.stdout.on('data', stdoutCb);
		proc.stderr.on('data', stderrCb);
		
		proc.on('exit', exitCb);
		
		// TODO: proc.on('exit', DELETE PID FILE);
		
		fs.writeFile(pidFilename, proc.pid.toString(), function(err) {
			if (err) {
				console.error('Cannot write pidfile ('+pidFilename+'):', err);
			}
		});
		
		cb(null, proc);
	} else {
		cb(new Exception('Cannot spawn process '+options.command));
	}
};

module.exports = start;