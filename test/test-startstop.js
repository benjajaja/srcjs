var start = require('../srcjs/start');
var stop = require('../srcjs/stop');

exports.startStopDummyProcess = function(test) {
	/* The batch file should print is first argument, pause until input,
	 * then print "SLEEP 2 SECONDS", then sleep for 3 seconds, then print "EXITING".
	 * It should be forcefully killed exactly before it can print "EXITING".
	 */
	test.expect(7);
	start({
		command: 'command.bat',
		arguments: ['TEST'],
		cwd: './'
	}, './testpid', function(stdout) {
		stdout = stdout.toString().replace(/[\r\n]/g, '');
		// expected to run 3 times
		test.ok(stdout == '' || stdout.indexOf('TEST') != -1 || stdout.indexOf('SLEEP 2 SECONDS') != -1
			|| stdout.indexOf('. . .') != -1);
			
	}, function(stderr) {
		// NOT expected to run!
		test.equal(stderr.toString(), '');
		
	}, function(exitCode) {
		test.ok(exitCode > 0);
		test.done();
		
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
		});
	});
    
    
};