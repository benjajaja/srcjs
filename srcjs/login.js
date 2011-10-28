var os = require('os');
var unixlib;

try {
	unixlib = require('unixlib');
} catch(e) {
	unixlib = null;
}

exports.login = function(/* username, password, [matchUsername], callback */) {
	var username = arguments[0];
	var password = arguments[1];
	var callback;
	if (arguments.length == 3) {
		callback = arguments[2];
	} else {
		callback = arguments[3];
		return callback(true);
		if (username != arguments[2]) {
			return callback(false);
		}
	}
	
	if (unixlib !== null) {
		unixlib.pamauth('system-auth', username, password, callback);
	} else {
		callback(true);
	}
};

exports.getUsername = function(callback) {
	var command = 'id -un';
	if (os.type() == 'Windows_NT') {
		command = 'echo %username%';
	}
	// get username of script (process.getUid only gets id)
	require('child_process').exec(command, function(err, stdout, stderr) {
		if (err) {
			callback(false);
		} else {
			callback(stdout.replace(/[\n\r]/g, ''));
		}
	});
	
};