SrcJS - Game server web administration
======================================

Control your game servers with a node.js + socket.io based web application.  
###The basic features for *all* types of game servers are:

* Start with custom command and args
* Stop with custom command batch, i. e. first send "quit" command, then send SIGKILL after a timeout if the process doesn't stop by itself
* Receive the process' stdout in real time!
* Send command to the process' stdin, in real time too!
* Login, based on node's unix username (no need to create an account somewhere)
* If node or the app crashed, the stdin/stdout connection will be lost, be you should still be able to stop the process based on it's PID
* Reload config file and plugins without restarting the app (nice for plugin development)

###Plugin features:

####Minecraft JSONAPI:
* Chat console
* Server console (without java garbage)
* Player list with some info
* Preview of player skin with WebGL hoohoo! ![Minecraft jsonapi plugin screenshot] (http://i.imgur.com/GaieN.jpg).
* TODO: add some tools to operate on player (teleport etc) and his inventory

####Source dedicated server RCON:
* work in progress

###Plugin architecture explained:
Theoretically, plugins have very little code-dependency.
It must be located in plugins/**name**/. It must have at least one file **plugin.js**, with module.exports being a function (contrary to the style of adding properties the exports object). It **MUST** return an object with a property **name** being the name of the plugin as string, and **unload** being a function with a parameter **callback** which must be called once the plugin has finished unloading.  
The module.exports function accepts three parameters: eventBus, io and name. This would be an example of a dummy plugin:

    module.exports = function(eventBus, io, name) {
        return {
            name: name,
            unload: function(callback) {
                callback();
            }
        };
    };

The arguments explained:  
**eventBus** is the plugin-event-bus; listen to it for

* procstart(isUnatteched): when the process is started; unAttached is boolean, referring to the availabilty of stdin/stdout
* procstop: when process is stopped
* connection(hasUsers): when there is the first socket.io connection (parameter true) or when there aren't any more (parameter false)

###Here is an example of a good config.json file:

    {
        // not actually used by srcjs, but by the defualt express server
        "port": 9009,
            
        "process": {
            // cwd of process, option to child_process.spawn
            "chdir": "../orangebox",
            
            // actual command
            "command": "./srcds_run", 
            
            // arguments to command. some programs, like "java", need each argument separated, others don't
            "arguments": ["-console", "-game hl2mp", "+map dm_lostarena", "+maxplayers 16", "-autoupdate"],
            
            // "setsid" option to child_process.spawn
            "setsid": true,
            
            // interval to send empty string to the process' stdin, zero to disable (source server need this to continue emitting stdout)
            "ioInterval": 2000,
            
            // custom stop sequence:
            // each item is executed in order.
            // if it has an "input" property, it will be sent to the process' stdin
            // if it has a "signal" property, it will be sent with pkill and then kill, reaching the entire process tree
            // if it has a "timeout" property, it will be executed after the given milliseconds since the previous entry
            "stop": [
                {"input": "say SERVER RESTART FROM CONSOLE, 3"},
                {"input": "say SERVER RESTART FROM CONSOLE, 2", "timeout": 1000},
                {"input": "say SERVER RESTART FROM CONSOLE, 1", "timeout": 1000},
                {"input": "say SERVER RESTART FROM CONSOLE, 0", "timeout": 1000},
                {"input": "quit"},
                {"signal": 9, "timeout": 2000}
            ]
        },
        
        // where to store pid for recovery after exit or crash
        "pidFilename": "proc.pid"
    }


###Module dependcies:
socket.io, unixlib.
mc_jsonapi plugin depends on mc_jsonapi (the npm module)
srcrcon plugin depends on srcds 

Copyright 2011 Benjamin Grosse