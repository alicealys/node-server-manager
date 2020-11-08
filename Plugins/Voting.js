const path              = require('path')
const wait              = require('delay')
const Permissions       = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`)).Permissions
const config            = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`))
const Localization      = require(path.join(__dirname, `../Configuration/Localization-${process.env.LOCALE}.json`)).lookup
const Utils             = new (require(path.join(__dirname, '../Utils/Utils.js')))()
const { Command, NodeServerManager }       = require(path.join(__dirname, `../Lib/Classes.js`))
class Plugin {
    constructor(Server, Manager) {
        this.Server = Server
        this.Manager = Manager
        this.voteTime = 120
        this.cooldownTime = 120
        this.currentVote = {
            Type: null,
            Origin: null,
            Target: null,
            Votes: [],
            callback: null
        }
        this.currentVoteDefault = {
            Type: null,
            Origin: null,
            Target: null,
            Votes: [],
            callback: null
        }
        this.votingSystem()
    }

    async startVote() {
        await wait(this.voteTime * 1000)
        
        if (this.currentVote.Type) {
            this.Server.Broadcast(Utils.formatString(Localization['COMMAND_VOTE_END'], { Action: this.currentVote.actionString }, '%')[0])
            this.currentVote.Origin.cooldownStart = new Date()
            this.currentVote = this.currentVoteDefault
        }
    }

    minimumVotes() {
        return this.Server.Clients.filter(x => x).length < 3 ? this.Server.Clients.filter(x => x).length : Math.ceil(this.Server.Clients.filter(x => x).length / 2)
    }

    hasVoted(Player) {
        for (var i = 0; i < this.currentVote.Votes.length; i++) {
            if (this.currentVote.Votes[i].ClientId == Player.ClientId) {
                return true
            }
        }

        return false
    }

    voteUpdate() {
        if (this.currentVote.Type && this.currentVote.Votes.length >= this.minimumVotes()) {
            this.currentVote.callback(this.currentVote)
            this.currentVote = this.currentVoteDefault
        }
    }

    async votingSystem() {

        var voteTypes = {
            Kick: {
                Name: 'VOTE_KICK',
                callback: async (Vote) => {
                    Vote.Target.Kick(Utils.formatString(Localization['COMMAND_VOTEKICK_KICK_MESSAGE'], {
                        origin: Vote.Origin.Name, 
                        originId: Vote.Origin.ClientId,
                        reason: Vote.Reason
                    }, '%')[0], NodeServerManager)
                }
            },
            Map: {
                Name: 'VOTE_MAP',
                callback: async (Vote) => {
                    var delay = 3000
                    this.Server.Broadcast(Utils.formatString(Localization['COMMAND_MAP_FORMAT'], {Name: Vote.Target.Alias, Delay: (delay / 1000).toFixed(0)}, '%')[0])
                    await wait(delay)
                    this.Server.Rcon.executeCommandAsync(`map ${Vote.Target.Name}`)
                }
            }
        }

        this.Manager.commands['stop'] = {
            ArgumentLength: 0,
            Alias: 'cancel',
            Permission: Permissions.Commands.COMMAND_MAP,
            inGame: true,
            callback: async (Player, args) => {
                switch (true) {
                    case (!this.currentVote.Type):
                        Player.Tell(Localization['COMMAND_VOTE_NO_VOTE'])
                    return
                }

                this.Server.Broadcast(Utils.formatString(Localization['COMMAND_VOTE_END'], { Action: this.currentVote.actionString }, '%')[0])
                this.currentVote = this.currentVoteDefault
            }
        }

        this.Manager.commands['yes'] = {
            ArgumentLength: 0,
            Permission: Permissions.Commands.COMMAND_USER_CMDS,
            inGame: true,
            callback: async (Player, args) => {
                switch (true) {
                    case (!this.currentVote.Type):
                        Player.Tell(Localization['COMMAND_VOTE_NO_VOTE'])
                    return
                    case (this.hasVoted(Player)):
                        Player.Tell(Localization['COMMAND_VOTE_ALREADY_VOTED'])
                    return
                }

                this.currentVote.Votes.push(Player)

                this.Server.Broadcast(Utils.formatString(Localization['COMMAND_VOTE_VOTED_TEMPLATE'], {
                    Name: Player.Name,
                    Prefix: config.commandPrefixes[0],
                    Action: this.currentVote.actionString,
                    Votes: this.currentVote.Votes.length,
                    minVotes: this.minimumVotes()
                }, '%')[0])

                this.voteUpdate()
            }
        }

        this.Manager.commands['votekick'] = {
            ArgumentLength: 2,
            Alias: 'vk',
            Permission: Permissions.Commands.COMMAND_USER_CMDS,
            inGame: true,
            callback: async (Player, args) => {
                var Target = await this.Server.findLocalClient(args[1])

                switch (true) {
                    case (args.slice(2).join(' ').length < 5):
                        Player.Tell(Utils.formatString(Localization['COMMAND_PARAM_LENGTH'], {
                            name: 'reason',
                            length: 5
                        }))
                    return
                    case (Player.Data.lastVote && (new Date() - Player.Data.lastVote) / 1000 < 300):
                        Player.Tell(Localization['VOTE_COMMANDS_COOLDOWN'])
                    return
                    case (!Target):
                        Player.Tell(Localization['COMMAND_CLIENT_NOT_FOUND'])
                    return
                    case (Target.PermissionLevel > Player.PermissionLevel):
                    case (Target.ClientId == Player.ClientId):
                        Player.Tell(Localization['COMMAND_VOTEKICK_HIERARCHY_ERR'])
                    return
                    case (Player.cooldownStart && new Date() - Player.cooldownStart > this.cooldownTime):
                        Player.Tell(Utils.formatString(Localization['COMMAND_VOTE_COOLDOWN'], { Time: (new Date() - Player.cooldownStart - this.cooldownTime) / 1000 }, '%')[0])
                    return
                    case (this.currentVote.Type && this.currentVote.Type != voteTypes.Kick.Name):
                    case (this.currentVote.Target && this.currentVote.Target.ClientId != Target.ClientId):
                        Player.Tell(Utils.formatString(Localization['COMMAND_VOTE_TYPE_ERR'], { Action: this.currentVote.actionString}, '%')[0])
                    return
                    case (this.hasVoted(Player)):
                        Player.Tell(Localization['COMMAND_VOTE_ALREADY_VOTED'])
                    return
                }

                if (!this.currentVote.Origin) {
                    Player.Data.lastVote = new Date()

                    Player.Data.lastVotes = Player.Data.lastVotes ? Player.Data.lastVotes : []
                    Player.Data.lastVotes.push(new Date())

                    var lastVotes = Player.Data.lastVotes.filter(date => (new Date() - date) / 1000 < 3600)

                    if (lastVotes.length >= 3) {
                        Player.Report(Utils.formatString(Localization['VOTEKICK_COMMNAD_REPORT'], {
                            player: Player.Name,
                            count: lastVotes.length
                        }, '%')[0])
                    }

                    this.currentVote = {
                        Origin: Player,
                        Target: Target,
                        Type: voteTypes.Kick.Name,
                        Reason: args.slice(2).join(' '),
                        Votes: [Player],
                        actionString: Utils.formatString(Localization['COMMAND_VOTEKICK_ACTION'], {Name: Target.Name, Reason: args.slice(2).join(' ')} , '%')[0],
                        callback: voteTypes.Kick.callback
                    }

                    this.Server.Broadcast(Utils.formatString(Localization['COMMAND_VOTE_VOTED_TEMPLATE'], {
                        Name: Player.Name,
                        Prefix: config.commandPrefixes[0],
                        Action: this.currentVote.actionString,
                        Reason: args.slice(2).join(' '),
                        Votes: 1,
                        minVotes: this.minimumVotes()
                    }, '%')[0])

                    this.startVote()
                    this.voteUpdate()
                    return
                }

                this.currentVote.Votes.push(Player)

                this.Server.Broadcast(Utils.formatString(Localization['COMMAND_VOTE_VOTED_TEMPLATE'], {
                    Name: Player.Name,
                    Prefix: config.commandPrefixes[0],
                    Action: Utils.formatString(Localization['COMMAND_VOTEKICK_ACTION'], {Name: this.currentVote.Target.Name} , '%')[0],
                    Votes: this.currentVote.Votes.length,
                    minVotes: this.minimumVotes()
                }, '%')[0])

                this.voteUpdate()
            }
        }

        this.Manager.commands['votemap'] = {
            ArgumentLength: 1,
            Alias: 'vm',
            gameTypeExclusions: ['zclassic', 'zstandard', 'infect'],
            Permission: Permissions.Commands.COMMAND_USER_CMDS,
            inGame: true,
            callback: async (Player, args) => {
                var Target = await this.Server.getMap(args[1])
    
                switch (true) {
                    case (Player.Data.lastVote && (new Date() - Player.Data.lastVote) / 1000 < 300):
                        Player.Tell(Localization['VOTE_COMMANDS_COOLDOWN'])
                    return
                    case (!Target):
                        Player.Tell(Localization['COMMAND_VOTEMAP_NOT_FOUND'])
                    return
                    case (Player.cooldownStart && new Date() - Player.cooldownStart > this.cooldownTime):
                        Player.Tell(Utils.formatString(Localization['COMMAND_VOTE_COOLDOWN'], { Time: parseInt(this.cooldownTime - (new Date() - Player.cooldownStart) / 1000) }, '%')[0])
                    return
                    case (this.currentVote.Type && this.currentVote.Type != voteTypes.Map.Name):
                    case (this.currentVote.Target && this.currentVote.Target.Name != Target.Name):
                        Player.Tell(Utils.formatString(Localization['COMMAND_VOTE_TYPE_ERR'], { Action: this.currentVote.actionString}, '%')[0])
                    return
                    case (this.hasVoted(Player)):
                        Player.Tell(Localization['COMMAND_VOTE_ALREADY_VOTED'])
                    return
                }

                if (!this.currentVote.Origin) {
                    Player.Data.lastVote = new Date()

                    this.currentVote = {
                        Origin: Player,
                        Target: Target,
                        Type: voteTypes.Map.Name,
                        Votes: [Player],
                        actionString: Utils.formatString(Localization['COMMAND_VOTEMAP_ACTION'], {Name: Target.Alias} , '%')[0],
                        callback: voteTypes.Map.callback
                    }

                    this.Server.Broadcast(Utils.formatString(Localization['COMMAND_VOTE_VOTED_TEMPLATE'], {
                        Name: Player.Name,
                        Prefix: config.commandPrefixes[0],
                        Action: this.currentVote.actionString,
                        Votes: 1,
                        minVotes: this.minimumVotes()
                    }, '%')[0])

                    this.startVote()
                    this.voteUpdate()
                    return
                }

                this.currentVote.Votes.push(Player)

                this.Server.Broadcast(Utils.formatString(Localization['COMMAND_VOTE_VOTED_TEMPLATE'], {
                    Name: Player.Name,
                    Prefix: config.commandPrefixes[0],
                    Action: this.currentVote.actionString,
                    Votes: this.currentVote.Votes.length,
                    minVotes: this.minimumVotes()
                }, '%')[0])

                this.voteUpdate()
            }
        }
    }
}
module.exports = Plugin
