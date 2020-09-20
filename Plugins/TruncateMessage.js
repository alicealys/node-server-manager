const sqlite3           = require('sqlite3').verbose()
const Sequelize         = require('sequelize')
const path              = require('path')
const Models            = require(path.join(__dirname, `../Lib/DatabaseModels.js`))
const Database  = require(path.join(__dirname, '../Lib/InitDatabase.js'))
const db = new Database()
const _utils            = require(path.join(__dirname, '../Utils/Utils.js'))
const Utils             = new _utils()
const wait              = require('delay')

const Permissions = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`)).Permissions

class Plugin {
  constructor(Server, Manager, Managers) {
    this.Server = Server
    this.Manager = Manager
    this.Managers = Managers
    this.Server.on('connect', this.onPlayerConnect.bind(this))
  }
  async onPlayerConnect(Player) {
    Player.on('message', async (Message) => {
        if (Message.length > this.Server.Rcon.commandPrefixes.Dvars.messagelength) {
            var truncatedMessage = this.chunkString(Message, this.Server.Rcon.commandPrefixes.Dvars.messagelength)
            for (var i = 1; i < truncatedMessage.length; i++) {
                this.Server.Broadcast(truncatedMessage[i])
                await wait(100)
            }

        }
    })
  }
  chunkString(str, length) {
    return str.match(new RegExp('.{1,' + length + '}', 'g'));
  }
}
module.exports = Plugin