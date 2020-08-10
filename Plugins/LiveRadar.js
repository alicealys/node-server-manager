var https = require('https');
const fs = require('fs');
var WebSocket = require('ws');
const options = {
    key: fs.readFileSync('/etc/ssl/private/private.key'),
    cert: fs.readFileSync('/etc/ssl/certs/certificate.crt'),
  };

var plugin = {
    Server: null,
    Manager: null,
    init: () => {
        /*var server = https.createServer(options, function(request, response) {});
        server.listen(8446, function() { });

        const wss = new WebSocket.Server({ server });

        wsConnections = [];

        wss.on('connection', function connection(conn) {
            wsConnections.push(conn);
        });

        setInterval(async () => {
                var posData = []
                var Positions = JSON.parse(await plugin.Server.Rcon.getDvar("liveradar_positions"))
                for (var i = 0; i < Positions.length; i++) {
                    var Player = plugin.Server.Clients[i]
                    posData[i] = {
                        Map: await plugin.Server.Rcon.getDvar("mapname"),
                        Player: {
                            Name: Player.Name,
                            Clientslot: Player.Clientslot,
                            ClientId: Player.ClientId
                        },
                        Coordinates: Positions[i][0],
                        Angle: Positions[i][1]
                    }
                }
                wsConnections.forEach(client => {
                    client.send(JSON.stringify(posData))
                });
        }, 200)*/
    },
    onLoad: function(Server, Manager) {
      this.Manager = Manager
      this.Server = Server
      this.init()
    }
}
module.exports = plugin