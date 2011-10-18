// let's quickly setup an express server. srcds/srcds.js handles socket.io and the game server.
var fs = require('fs');
var app = require('express').createServer();

app.configure(function(){
	//app.use(require('express').logger());
	app.use(require('express').bodyParser());
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


var srcjs = require('./srcjs/srcjs')('config.json', app, function(port) {
	app.listen(port);
	console.log('express started on port '+port);
});




