SrcJS - Game server web administration
======================================

Control your game servers with a node.js + socket.io based web application.  
###The basic features for *all* types of game servers are:

* Start with custom command and args
* Stop with custom command batch, i. e. first send "quit" command, then send SIGKILL after a timeout if the process doesn't stop by itself
* Receive the process' stdout in real time!
* Send command to the process' stdin, in real time too!
* Login, based on node's unix username (no need to create an account somewhere). If you want to use it windows, make the login configurable and implemente it.
* If node or the app crashed, the stdin/stdout connection will be lost, be you should still be able to stop the process based on it's PID
* Reload config file and plugins without restarting the app (nice for plugin development) (buggy?)

###Plugin features:

####Minecraft JSONAPI:
* Chat console
* Server console (without java garbage)
* Player list with some info
* Preview of player skin with WebGL hoohoo! ![Minecraft jsonapi plugin screenshot] (http://i.imgur.com/GaieN.jpg).
* Teleport, kick, band, say as player
* Set player inventory items

####Source dedicated server RCON:
* work in progress

###Plugin architecture explained:
Theoretically, plugins have very little code-interdependency.

There is an example plugin called "sample". It has very detailed instructions on how to communicate
client-server wise, and how to communicate with the application and/or other plugins through the
event bus.

###Here is an example of a good config.json file:
Take a look at config_example.json. It's setup for a minecraft server.


###Module dependcies:
socket.io, unixlib.
srcrcon plugin depends on srcds module. 

Copyright 2011 Benjamin Grosse