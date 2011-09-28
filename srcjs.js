// let's quickly setup an express server. srcds/srcds.js handles socket.io and the game server.
var fs = require('fs');
var app = require('express').createServer();

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
        "port": 80, // this happens to be here so you can use it to configure your webserver conveniently in one place
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
var srcjs = require('./srcjs/srcjs')('config.json', function(port) {
	
	app.listen(port);
	console.log('express started on port '+port);
	
	srcjs.start(app);
	
});




