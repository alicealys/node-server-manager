# node-server-manager
Server Manager for Plutonium Servers and probably all other Call of Duty dedicated servers
# Linux Install
Requirements
* nodejs (latest)
* npm
```bash
git clone https://github.com/fedddddd/node-server-manager.git
cd node-server-manager
npm install
chmod +x StartNSM.sh
./StartNSM.sh
```

# Windows Install
Requirements
* nodejs
* npm

Install both from [here](https://nodejs.org/en/)
```batch
// Clone the repository
cd node-server-manager
npm install
StartNSM.bat
```
# Configuration
| Paramter | Description |
| --- | --- |
| Enable webfront ( true / false ) | Whether you want to enable the webfront or not |
| Webfront bind port [0-65536] | Port the webfront will bind to |
| Enable webfront https (true / false) | Whether to enable ssl on the webfront |
| SSL Key file | Provide the path for the SSL key |
| SSL Certificate file | Provide a path for the SSL certificate |
| Webfront hostname | The url that will be used for the webfront ( for example in the discord webhook plugin) |
| Discord WebHook url | ( Optional ) specify the discord webhook url if you want to enable it |
| MOTD | (Message of  the day) will show up at the bottom of every webfront page ( you can use xbbcode to format it and cod color codes (^1, ^2...) as well as placeholders |
| Server IP | IP Address of the server |
| Server Port | Port of the server |
| Server Rcon password | Password for the rcon (remote console) of the server |
| Server Log File path | Path of the server's logfile |

Other optional parameters
| Paramter | Description |
| --- | --- |
| LOGSERVERURI | If your dedicated server is in a different vps / server you can use the log server for that (example url: ws://{ip}:{port}/&key={key}) |
| Info | Text that will be shown in the /info page of the webfront, can be formatted using xbbcode [exmaple](http://patorjk.com/bbcode-previewer/) and cod color codes (^1, ^2,...) you can also add placeholders |
| Permissions | Contains configuration for levels, commands and roles |
| Levels | Contains role base names and their level |
| Commands | Contains permissions for all commands |
| Roles | Contains the role base names and their display names |

Text Placeholders
| Name | Description |
| --- | --- |
| {USERNAME} | Current logged in client's username |
| {CLIENTID} | Current logged in client's ClientId |
| {PLAYERCOUNT} | Online players count |
| {SERVERCOUNT} | Online servers count |
| {TOPSERVER-IP} | IP of the currently most populated server |
| {TOPSERVER-PORT} | Port of the currently most populated server |
| {TOPSERVER-HOSTNAME} | Hostname of the currently most populated server |
| {TOPSERVER-PLAYERS} | Player count of the currently most populated server |

# Commands

soon 

# Plugins

Functionality can be extended using plugins. Plugins must be placed in the Plugins/ folder and must follow this structure:
```js
class Plugin {
  constructor(Server, Manager) {
    this.Server = Server
    this.Manager = Manager
    // do whatever...
    /* Add event listeners
      Server.on('connect', this.playerConnected.bind(this))
    */
  }
  playerConnected(Player) {
    // Player contains: ClientSlot, Name, IPAddress, etc... for more information see the Player structure Lib/Entity/ePlayer.js
    // Player events: kill (Victim, Attack), death (Attacker, Attack), message (Message)
    // Player methods: Tell, Ban, Kick, Tempban
    Player.Tell('Hello World')
  }
}

module.exports = Plugin
```
