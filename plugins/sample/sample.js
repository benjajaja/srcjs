/**
 * Sample plugin - server side script
 * eventBus: eventBus for plugins.
 * 		List of events to listen to:
 * 			"status": when the process starts or stops, and when (srcjs-web-) clients
 * 				connect or disconnect.
 * 				Has one parameter, "status", with these boolean properties:
 * 					"running": if process is running or not
 * 					"anyUsers": tells if there are any users connected to this application
 * 				You should probably use the combination of "running" and "anyUsers" to tell if
 * 				your plugin should be polling, listening, etc, or be idle to avoid wasting resources.
 * 			
 * 			"stdouterr": the process' stdout and stderr, like displayed in the main console.
 * 				WARNING: It is always BAD idea to try to parse the process' stdout, for several reasons.
 * 				Parsing will be slow, stdout may be split up in the middle of a line, it MAY get mixed up
 * 				with stderr, and more unpredictable behavior. Don't try to parse it! Use some other way
 * 				to communicate with the process, like the srcron protocol for source games, the JSONAPI
 * 				plugin for minecraft, or your game's preferred method.
 * 				IN FACT THIS IS SUCH A BAD IDEA THAT THIS ISN'T EVEN IMPLEMENTED ;P
 * 
 * 			"YOURPLUGINNAME.YOUREVENTNAME": Want other plugins to be able to communicate with you?
 * 				There you go!
 * 
 * 		List of emittable events:
 * 			"stdin": Write the string you passed along to the process' stdin.
 * 			"OTHERPLUGINNAME.THEIREVENTNAME": Want to tell something to another plugin? There you go!
 * 
 * io: use
 * 		io.of('/'+YOURPLUGINNAME);
 * 		To get a private namespace. Do not interact with the global io.
 * config: the "plugin.YOURPLUGINNAME" object of config.json
 * name: will be YOURPLUGINNAME, the name of the folder of your plugin (and therefore this script's
 * 		filename without extension), for your convenience.
 */
module.exports = function(eventBus, io, config, name) {
	config = config || {};
	config.sampleProperty = typeof config.sampleProperty != 'undefined' ? config.sampleProperty : 'someting';
	
	// this plugin's private socket.io channel
	var pluginio = io.of('/'+name);
	
	/* let's add some client action: this event needs and array of objects and the plugin name.
	 * The object describe the client-side js files:
	 * "plugin": simply this function's "name" parameter
	 * "filename": optional, a filename, if other than "plugin-name.js"
	 * Take a look into plugins/sample/client/*.js for info on what to do in client scripts.
	 */
	eventBus.emit('addscripts', [
	    {plugin: name}, // loads plugins/sample/client/sample.js
	    {plugin: name, filename: 'additional.js'} // loads additional client script, allows to split source across files
	], name);
	
	// add a special route to express: /plugins/sample/someroute/someparameter
	eventBus.emit('addroutes', [{
		plugin: name,
		path: 'someroute/:someparameter',
		callback: function(req, res) {
			// do anything
			res.send('received parameter: '+parseInt(req.params.someparameter));
		}
	}], name);
	
	eventBus.on('status', function(status) {
		// console.log('status:', status);
	});
	
	
	pluginio.on('connection', function(socket) {
		// socket is the just connected user's websocket, so events on socket are
		// sent and received only for that one user
		
		// let's make up some useless communication
		socket.on('myclientevent', function(data) {
			socket.emit('myserverevent', {message: 'Please help me, I\'m trapped!'});
		});
	});
	/**
	 * Returned object must have these properties:
	 * "name": simply this function's "name" parameter
	 * "unload": function with a "callback" parameter (a function).
	 * 			Take care to remove all listeners on all event emitters, clear intervals and pending
	 * 			timeouts, unload/stop internal objects, then call the callback.
	 * 			You will at least have to remove the "connection" event listener on pluginio.
	 */
	return {
		name: name,
		unload: function(cb) {
			pluginio.removeAllListeners('connection');
			cb();
		},
	};
};