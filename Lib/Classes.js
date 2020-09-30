const path              = require('path')
const Localization      = require(path.join(__dirname, `../Configuration/Localization.json`)).lookup
const Utils             = new (require(path.join(__dirname, '../Utils/Utils.js')))()
const Permissions       = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`)).Permissions

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
    setAlias(Alias) {
        this.Alias = Alias
        return this
    }
    addException(Condition, returnString) {
        this.Exceptions.push({ Condition, returnString })
        return this
    }
    addParam(Index, Name, Join = false) {
        this.Params.push({ Index, Name, Join })
        return this
    }
    addCallback(Callback) {
        this.Callbacks.push(Callback)
        return this
    }
    setPermission(Perm) {
        switch (true) {
            case (Number.isInteger(Perm)):
                this.PermissionLevel = Level
            return
            case (Permissions.Roles[Perm]):
                this.PermissionLevel = Utils.getRoleFrom(Perm, 0).Level
            return
            case (Permissions.Levels[Perm]):
                this.PermissionLevel = Permissions.Levels[Perm]
            return
        }
        return this
    }
}

module.exports = { Command }