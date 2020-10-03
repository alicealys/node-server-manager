const path              = require('path')
const Localization      = require(path.join(__dirname, `../Configuration/Localization.json`)).lookup
const Utils             = new (require(path.join(__dirname, '../Utils/Utils.js')))()
const Permissions       = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`)).Permissions

var NodeServerManager = {
    ClientId: 1,
    Name: 'Node Server Manager',
    Guid: 'node'
}

class Command {
    constructor() {
        this.Name = 'testcommand'
        this.Alias = ''
        this.PermissionLevel = 0
        this.inGame = false
        this.Exceptions = []
        this.Params = []
        this.Callbacks = []
        this.defaultCallback = (Player, args) => { 
            Player.Tell(Localization['COMMAND_NOT_SETUP']) 
        }
    }
    setName(Name) {
        this.Name = Name
        return this
    }
    setMiddleware(Bool) {
        this.isMiddleware = Bool
        return this
    }
    setAlias(Alias) {
        this.Alias = Alias
        return this
    }
    setInGame(inGame) {
        this.inGame = inGame
        return this
    }
    addException(Condition, returnString) {
        this.Exceptions.push({ Condition, returnString })
        return this
    }
    addParam(Index, Name, Options) {
        this.Params.push({ Index, Name, Options })
        return this
    }
    addCallback(Callback) {
        this.Callbacks.push(Callback)
        return this
    }
    setPermission(Perm) {
        this.PermissionLevel = Permissions.Levels[Perm]
        return this
    }
}

module.exports = { Command, NodeServerManager }