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
}