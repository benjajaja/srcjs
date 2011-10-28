var http = require('http');

var downloadSkin = function(url, response, logCallback) {
	if (typeof logCallback == 'undefined') {
		logCallback = function() {};
	}
	var options = {
		host: url.substring(0, url.indexOf('/')),
		port: 80,
		path: url.substring(url.indexOf('/')),
		timeout: 10
	}
	logCallback('forward: '+options.host+options.path);
	var req = http.request(options, function(res) {
		logCallback('request has responded');
		var cache = '';
		
		res.setEncoding('binary')
		
		res.on('data', function(chunk) {
			if (res.statusCode == 200) {
				logCallback('piping data...');
				cache += chunk;
				response.write(chunk, 'binary');
					
				
			} else {
				logCallback('status: '+res.statusCode);
			}
		});
		res.on('end', function() {
			if (res.statusCode == 302) {
				logCallback('request 302');
				var location = res.headers.location;
				if (location.indexOf('://') != -1) {
					location = location.substring(location.indexOf('://') + 3);
				}
				downloadSkin(location, response, logCallback);
			} else {
				response.end();
			}
		});
		res.on('close', function(errno) {
			// terminated?
			response.end('request closed, errno: '+errno);
		});
		
	});
	req.on('error', function(e) {
		logCallback('error: ', e);
		response.end(e.toString());
	});
	req.end();
};
module.exports = downloadSkin;