var unixlib;
try {
	unixlib = require('unixlib');
} catch(e) {
	unixlib = null;
}

exports.login = function(username, password, callback) {
	if (unixlib !== null) {
		unixlib.pamauth('system-auth', username, password, callback);
	} else {
		callback(true);
	}
};

exports.getUsername = function(callback) {
	var command = 'id -un';
	if (require('os').type() == 'Windows_NT') {
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