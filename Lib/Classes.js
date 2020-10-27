const path              = require('path')
const Localization      = require(path.join(__dirname, `../Configuration/Localization-${process.env.LOCALE}.json`)).lookup
const Permissions       = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`)).Permissions

const NodeServerManager = {
    ClientId: 1,
    Name: 'Node Server Manager',
    Guid: 'node'
}

class Command {
    constructor(command = {}) {
        this.name = command.name ? command.name : ''
        this.alias = command.alias ? command.alias : ''
        this.permission = command.permission ? Permissions.Levels[command.permission] : 0
        this.inGame = command.Ingame ? command.inGame : false
        this.isMiddleware = command.isMiddleware ? command.isMiddleware : false
        this.exceptions = command.exceptions ? command.exceptions : []
        this.params = command.params ? command.params : []
        this.callbacks = command.callbacks ? command.callbacks : []
        this.defaultCallback = (Player) => { 
            Player.Tell(Localization['COMMAND_NOT_SETUP']) 
        }
    }
    setName(name) {
        this.name = name
        return this
    }
    setMiddleware(bool) {
        this.isMiddleware = bool
        return this
    }
    setAlias(alias) {
        this.alias = alias
        return this
    }
    setInGame(inGame) {
        this.inGame = inGame
        return this
    }
    addException(error, callback) {
        this.exceptions.push({ error, callback })
        return this
    }
    addParams(params) {
        this.params = this.params.concat(params)
        return this
    }
    addParam(param) {
        this.params.push(param)
        return this
    }
    addCallback(callback) {
        this.callbacks.push(callback)
        return this
    }
    setPermission(perm) {
        this.permission = Permissions.Levels[perm]
        return this
    }
}

module.exports = { Command, NodeServerManager }