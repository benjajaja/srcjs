var start = require('../srcjs/start');
var stop = require('../srcjs/stop');

exports.start = function(test) {
	/* The batch file should print is first argument, pause until input,
	 * then print "SLEEP 2 SECONDS", then sleep for 3 seconds, then print "EXITING".
	 * It should be forcefully killed exactly before it can print "EXITING".
	 */
	start({
		command: 'command.bat',
		arguments: ['TEST'],
		cwd: './'
	}, './testpid', function(stdout) {
		stdout = stdout.toString().replace(/[\r\n]/g, '');
		test.ok(stdout == '' || stdout.indexOf('TEST') != -1 || stdout.indexOf('SLEEP 2 SECONDS') != -1
			|| stdout.indexOf('Press any key to continue') != -1);
	}, function(stderr) {
		test.equal(stderr.toString(), '');
	}, function(exitCode) {
		test.equal(exitCode, 0);
	}, function(error, proc) {
		test.ifError(error);
		test.notEqual(proc, null);
		stop(proc, {
			isWindows: true,
			pidFilename: './testpid',
			process: {
				stop: [
					{input: 'INPUT'},
					{signal: 9, timeout: 1000}
				]
			}
		}, function(error, signal) {
			test.ifError(error);
			test.done();
		});
	});
    
    
};