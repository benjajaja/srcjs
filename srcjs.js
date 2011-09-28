var app = require('express').createServer();
var fs = require('fs');

app.configure(function(){
	app.use(app.router);
	app.use(require('express').static(__dirname + '/public'));
	app.use(require('express').errorHandler({ dumpExceptions: true, showStack: true }));
});

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});

app.post('/ignoreme', function (req, res) {
	res.send('(silence)');
});

/* Example config.json:
{
        "port": 80,
        "process": {
                "chdir": "../orangebox", // execute command in this dir
                "command": "./srcds_run",
                "arguments": ["-console", "-game hl2mp", "+map dm_quecojones", "+maxplayers 16", "-autoupdate"],
                "setsid": true, // set session?
                "ioInterval": 1000 // interval to write empty string to process' stdin
        },
        "pidFilename": "proc.pid"
}
*/
fs.readFile('config.json', function(err, options) {
	if (err) throw err;

	options = JSON.parse(options.toString())
	
	app.listen(options.port);
	console.log('express started on port '+options.port);
	
	require('./srcjs/srcjs')(app, options);
	
});
