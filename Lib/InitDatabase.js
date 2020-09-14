const Sequelize         = require('sequelize')
const bcrypt            = require('bcrypt')
const Models            = require('./DatabaseModels.js')

class Database {
    constructor () {
        this.clientCache = []
    }

    async startTransaction() {
        if (this.transaction) return
        this.transaction = await Models.DB.transaction()
    }

    async addClient(Guid) {
        await this.startTransaction()
        if (await this.getClientId(Guid)) return

        if (!(await this.getClientId('Node'))) {
            try {
                await Models.NSMClients.build({
                    Guid: 'Node',
                    PermissionLevel: 6
                }, {transaction: this.transaction}, {transaction: this.transaction}).save()
            }
            catch (e) { }
        }

        var Client = await Models.NSMClients.build({
            Guid: Guid
        }, {transaction: this.transaction}, {transaction: this.transaction}).save()

        // await this.transaction.commit()

        return Client.dataValues.ClientId
    }

    async initializeStats(ClientId) {
        if (!(await this.getPlayerStatsTotal(ClientId))) {
            await Models.NSMPlayerStats.build({
                ClientId: ClientId
            }, {transaction: this.transaction}).save()
        }
        if (!(await this.getClientSettings(ClientId))) {
            await Models.NSMSettings.build({
                ClientId
            }, {transaction: this.transaction}).save()
        }
        // await this.transaction.commit()
    }

    async setClientSetting(ClientId, Setting, Value) {
        await Models.NSMSettings.update(
            { [Setting]: Value },
            { where: { ClientId: ClientId } }, {transaction: this.transaction})
        // await this.transaction.commit()
    }

    async getClientSettings(ClientId) {

        var Settings = await Models.NSMSettings.findAll({
            where: {
                ClientId
            }
        }, {transaction: this.transaction})
        return Settings.length > 0 ? Settings[0].dataValues : false
    }

    async getMostUsedWeapon(ClientId) {
        var Weapon = await Models.NSMKills.findAll({
            attributes: ['BaseWeapon', [Sequelize.fn('count', Sequelize.col('BaseWeapon')), 'occurrence']],
            where: {
                ClientId: ClientId
            },
            limit: 1,
            order: [
                [Sequelize.literal('occurrence'), 'desc']
            ],
            group: ['BaseWeapon']
        }, {transaction: this.transaction})
        
        return Weapon.length > 0 ? Weapon[0].dataValues.BaseWeapon : false
    }

    async getMostCommonHitLoc(ClientId) {
        var HitLoc = await Models.NSMKills.findAll({
            attributes: ['HitLoc', [Sequelize.fn('count', Sequelize.col('HitLoc')), 'occurrence']],
            where: {
                ClientId: ClientId
            },
            limit: 1,
            order: [
                [Sequelize.literal('occurrence'), 'desc']
            ],
            group: ['HitLoc']
        }, {transaction: this.transaction})
        
        return HitLoc.length > 0 ? HitLoc[0].dataValues.HitLoc : false
    }

    async getTotalDamage(ClientId) {
        var Damage = await Models.NSMKills.findAll({
            attributes: [[Sequelize.fn('sum', Sequelize.col('Damage')), 'totalDamage']],
            where: {
                TargetId: ClientId
            },
            group: ['BaseWeapon']
        }, {transaction: this.transaction})
        
        return Damage.length > 0 ? Damage[0].dataValues.totalDamage : false
    }

    async getPlayerKills(ClientId) {

        var Kills = await Models.NSMKills.findAll({
            where: {
                ClientId: ClientId
            }
        }, {transaction: this.transaction})

        return Kills.length
    }
    async getPlayerDeaths(ClientId) {

        var Deaths = await Models.NSMKills.findAll({
            where: {
                TargetId: ClientId
            }
        }, {transaction: this.transaction})

        return Deaths.length
    }

    async getOwner() {

        var Owner = await Models.NSMClients.findAll({
            where: {
                PermissionLevel: 5
            }
        }, {transaction: this.transaction})
        
        return Owner.length > 0 ? Owner[0].dataValues : false
    }
    async getClientByName(Name) {
        var _Clients = await Models.NSMConnections.findAll({
            order: [
                ['Date', 'desc']
            ],
            group: ['ClientId'],
            where: {
                Name: {
                    [Sequelize.Op.like]: `%${Name.toLocaleLowerCase()}%`
                }
            }
        }, {transaction: this.transaction})
        var Clients = []
        for (var i = 0; i < _Clients.length; i++) {
            var Client = await this.getClient(_Clients[i].dataValues.ClientId)
            Client.Name = _Clients[i].dataValues.Name
            Client.LastConnection = _Clients[i].dataValues.Date
            Client.IPAddress = _Clients[i].dataValues.IPAddress
            Clients.push(Client)
        }
        return Clients
    }

    async logActivity(Origin, Type, Description) {
        await Models.NSMAudit.build({
            Origin,
            Type,
            Description
        }, {transaction: this.transaction}).save()
        // await this.transaction.commit()
    }

    async getAudit(pageNumber, limit) {
        var Audit = await Models.NSMAudit.findAll({
            order: [
                ['Date', 'desc']
            ],
            limit: limit,
            offset: pageNumber * limit,
        }, {transaction: this.transaction})
        Audit.map(x => x = x.dataValues)
        for (var i = 0; i < Audit.length; i++) {
            try {
                var Name = this.clientCache[parseInt(Audit[i].Origin.substr(1))] ? this.clientCache[parseInt(Audit[i].Origin.substr(1))].Name : (await this.getClient(Audit[i].Origin.substr(1))).Name
            }
            catch (e) {
                Audit[i] = null
                continue
            }
            Audit[i].Origin = {
                Name: Audit[i].Origin.match(/\@([0-9]+)/g) ? Name : Audit[i].Origin,
                ClientId: Audit[i].Origin.match(/\@([0-9]+)/g) ? Audit[i].Origin.substr(1) : null
            }
        }
        return Audit
    }

    async getClientLevel(ClientId) {

        var Level = await Models.NSMClients.findAll({
            arguments: ['PermissionLevel'],
            where: {
                ClientId: ClientId
            }
        }, {transaction: this.transaction})

        return Level[0].dataValues.PermissionLevel
    }

    async unbanClient(TargetId, OriginId, Reason) {
        var Penalties = await Models.NSMPenalties.update(
            { Active: false },
            { where: { TargetId: TargetId, Active: true } }, {transaction: this.transaction}
        )

        Penalties.length > 0 && await Models.NSMPenalties.build({
            TargetId,
            OriginId,
            PenaltyType: 'PENALTY_UNBAN',
            Duration: 0,
            Reason: Reason
        }, {transaction: this.transaction})
        // await this.transaction.commit()
        return Penalties[0]
    }

    async getClient(ClientId) {
    
        if (ClientId == 1) {
            return {
                Name: 'Node Server Manager',
                ClientId: 1,
                Guid: 'node',
                IPAddress: '127.0.0.1'
            }
        }

        var Client = await Models.NSMClients.findAll({
            where: {
                ClientId: ClientId
            }
        }, {transaction: this.transaction})

        var Connection = await Models.NSMConnections.findAll({
            order: [
                ['Date', 'desc']
            ],
            limit: 1,
            where: {
                ClientId: ClientId
            }
        }, {transaction: this.transaction})

        if (Connection.length == 0) return false

        await this.initializeStats(ClientId)

        delete Client[0].dataValues.Password
        
        var Client = {...Client[0].dataValues, ...Connection[0].dataValues}

        Client.Settings = await this.getClientSettings(ClientId)

        this.clientCache[parseInt(ClientId)] = Client

        return Client
    }

    async addPenalty(PenaltyMeta) {
        var Penalty = await Models.NSMPenalties.build(PenaltyMeta, {transaction: this.transaction}).save()
        // await this.transaction.commit()
        return Penalty.dataValues
    }

    async setLevel(Player, Level) {
        Models.NSMClients.update(
            { PermissionLevel: Level },
            { where: { ClientId: Player.ClientId } }
            , {transaction: this.transaction})
        // await this.transaction.commit()
    }

    async getAllPenalties(ClientId = null) {
        var where = ClientId ? {
            where: {
                TargetId: ClientId,
            }
        } : null
        var Penalties = await Models.NSMPenalties.findAll(where, {transaction: this.transaction})

        for (var i = 0; i < Penalties.length; i++) {
            Penalties[i] = Penalties[i].dataValues
        }

        return Penalties
    }

    async getStats(pageNumber, limit, sort) {
        try {
            var Stats = await Models.NSMPlayerStats.findAll({
                limit: limit,
                order: [
                    [sort, 'desc']
                ],
                offset: limit * pageNumber
            }, {transaction: this.transaction})
        }
        catch (e) {
            var Stats = await Models.NSMPlayerStats.findAll({
                limit: limit,
                order: [
                    ['Kills', 'desc']
                ],
                offset: limit * pageNumber
            }, {transaction: this.transaction})
        }

        for (var i = 0;  i < Stats.length; i++) {
            Stats[i] = Stats[i].dataValues
            Stats[i].Client =  (await this.getClient(Stats[i].ClientId))
        }
        return Stats
    }

    async getClientMeta(ClientId) {
        var Meta = {
            MostUsed: await this.getMostUsedWeapon(ClientId),
            HitLoc: await this.getMostCommonHitLoc(ClientId),
            Damage: await this.getTotalDamage(ClientId)
        }
        return Meta
    }

    async getClientField(ClientId, Field) {
        var Fields = await Models.NSMClients.findAll({
            where: {
                ClientId: ClientId
            }
        }, {transaction: this.transaction})

        return Fields.length > 0 ? Fields[0].dataValues[Field] : false
    }

    async setClientField(ClientId, Field, Value) {
        Models.NSMClients.update(
            { [Field] : Value},
            {where: {ClientId: ClientId}}, {transaction: this.transaction})
        // await this.transaction.commit()
    }

    async getTokenHash(ClientId) {
        var Token = await Models.NSMTokens.findAll({
            where: {
                ClientId: ClientId
            }
        }, {transaction: this.transaction})
        return Token.length > 0 ? Token[0].dataValues : false
    }

    async createToken(ClientId, Token) {
        bcrypt.hash(Token, 10, async (err, hash) => {
            await Models.NSMTokens.destroy({
                where: {
                    ClientId: ClientId
                }
            }, {transaction: this.transaction})
            await Models.NSMTokens.build({
                ClientId: ClientId,
                Token: hash
            }, {transaction: this.transaction}).save()
            // await this.transaction.commit()
        })
    }

    async getPlayerStatsTotal(ClientId) {
        var Stats = await Models.NSMPlayerStats.findAll({
            attributes: ['Kills', 'Deaths', 'PlayedTime', [Sequelize.literal('max(Performance, 0)'), 'Performance'], 'TotalPerformance'],
            where: {
                ClientId: ClientId
            }
        }, {transaction: this.transaction})
        return Stats.length > 0 ? Stats[0].dataValues : false
    }

    async getGlobalStats() {
        var totalKills = (await Models.NSMKills.count({}, {transaction: this.transaction}))

        var totalPlayedTime = (await Models.NSMPlayerStats.findAll({
            attributes: [[Sequelize.fn('sum', Sequelize.col('PlayedTime')), 'totalPlayedTime']],
        }))[0].dataValues.totalPlayedTime

        return {totalKills, totalPlayedTime}
        //return Stats.length > 0 ? Stats[0].dataValues : false
    }

    async getPlayerStats(ClientId) {
        var Player = await this.getClient(ClientId)
        if (!Player) return false
        var Stats = {
            Kills: await this.getPlayerKills(ClientId),
            Deaths: await this.getPlayerDeaths(ClientId),
            Player: Player
        }
        return Stats
    }

    async addStatRecord(ClientId, TotalPerformance, Performance) {
        return await Models.NSMPlayerStatHistory.build({ ClientId, TotalPerformance, Performance }, {transaction: this.transaction}).save()
    }

    async getStatHistory(page, limit) {
        var Stats = (await Models.NSMPlayerStats.findAll({
            limit: limit,
            attributes: ['ClientId', 'Kills', 'Deaths', [Sequelize.literal('max(Performance, 0)'), 'Performance'], 'TotalPerformance', 'PlayedTime', 'Id', [Sequelize.literal('ROW_NUMBER() over (order by Performance desc)'), 'Rank']],
            where: {
                [Sequelize.Op.and]: [
                    Sequelize.literal('Kills+Deaths >= 50')
                ],
                PlayedTime: {
                    [Sequelize.Op.gte]: 120
                }
            },
            order: [
                ['Performance', 'desc']
            ],
            offset: limit * page
        }, {transaction: this.transaction})).map(x => x = x.dataValues)

        for (var i = 0; i < Stats.length; i++) {
            Stats[i].History = (await Models.NSMPlayerStatHistory.findAll({
                where: {ClientId: Stats[i].ClientId},
                limit: 100,
                attributes: [[Sequelize.literal('max(Performance, 0)'), 'Performance'], 'Date'],
                order: [
                    ['Date', 'desc']
                ]
            })).map(s => s = {x: s.Date, y: s.Performance})
        }

        return Stats
    }

    async getClientId(Guid) {

        var result = await Models.NSMClients.findAll({
            attributes: ['ClientId'],
            where: {
                Guid: Guid
            }
        }, {transaction: this.transaction})

        return result.length > 0 ? result[0].dataValues.ClientId : false
    }

    async getAllClients() {
        return await Models.NSMClients.findAll({}, {transaction: this.transaction})
    }

    async getAllConnections(ClientId) {
        var Connections = await Models.NSMConnections.findAll({
            where: {
                ClientId
            }
        }, {transaction: this.transaction})
        return Connections.length > 0 ? Connections : false
    }

    async logConnection(ePlayer) {
        var ClientId = await this.getClientId(ePlayer.Guid)
        
        var Connection = await Models.NSMConnections.build({
            ClientId: ClientId,
            IPAddress: ePlayer.IPAddress,
            Guid: ePlayer.Guid,
            Name: ePlayer.Name
        }, {transaction: this.transaction}).save()
        // await this.transaction.commit()

        return Connection.dataValues
    }
    async logKill(AttackerId, TargetId, Attack) {
        var Kill = await Models.NSMKills.build({
            ClientId: AttackerId,
            TargetId: TargetId,
            Weapon: Attack.Weapon,
            MOD: Attack.MOD,
            HitLoc: Attack.HitLoc,
            Damage: Attack.Damage,
            BaseWeapon: Attack.BaseWeapon
        }, {transaction: this.transaction}).save()
        // await this.transaction.commit()
        return Kill.dataValues
    }

    async getAllMessages(From, page, limit) {
        if (From) {
            var Messages = await Models.NSMMessages.findAll({
                where: {
                    OriginId: From
                },
                order: [
                    ['Date', 'desc']
                ],
            }, {transaction: this.transaction})
        } else {
            var Messages = await Models.NSMMessages.findAll({
                order: [
                    ['Date', 'desc']
                ],
                limit: limit,
                offset: page * limit,
            }, {transaction: this.transaction})
        }
        for (var i = 0; i < Messages.length; i++) {
            Messages[i] = Messages[i].dataValues
        }
        return Messages
    }

    async isBanned(ClientId) {
        var playerPenalties = await this.getAllPenalties(ClientId)
        for (var i = 0; i < playerPenalties.length; i++) {
            if (!playerPenalties[i].Active) continue
            switch (playerPenalties[i].PenaltyType) {
                case 'PENALTY_PERMA_BAN':
                    return {
                        Banned: true,
                        Type: playerPenalties[i].PenaltyType,
                        Duration: playerPenalties[i].Duration,
                        Reason: playerPenalties[i].Reason
                    }
                return
                case 'PENALTY_TEMP_BAN':
                    var dateDiff = (new Date(playerPenalties[i].Date) - new Date()) / 1000
                    if (dateDiff + playerPenalties[i].Duration > 0) {
                        return {
                            Banned: true,
                            Type: playerPenalties[i].PenaltyType,
                            Duration: playerPenalties[i].Duration,
                            Reason: playerPenalties[i].Reason
                        }
                    }
                break
            }
        }
        return {
            Banned: false
        }
    }

    async getMessageCount(ClientId) {
        return await Models.NSMMessages.count({where: {OriginId: ClientId}})
    }

    async getMessages(From, pageNumber, limit) {
        if (From) {
            var Messages = await Models.NSMMessages.findAll({
                where: {
                    OriginId: From
                },
                order: [
                    ['Date', 'desc']
                ],
                limit: limit,
                offset: pageNumber * limit,
            }, {transaction: this.transaction})
            var Penalties = await Models.NSMPenalties.findAll({
                where: Sequelize.or({ TargetId: From}, {OriginId: From}),
                order: [
                    ['Date', 'desc']
                ],
                limit: limit,
                offset: pageNumber * limit,
            }, {transaction: this.transaction})
        } else {
            var Messages = await Models.NSMMessages.findAll({
                order: [
                    ['Date', 'desc']
                ],
                limit: limit,
                offset: pageNumber * limit,
            }, {transaction: this.transaction})
            var Penalties = await Models.NSMPenalties.findAll({
                order: [
                    ['Date', 'desc']
                ],
                limit: limit,
                offset: pageNumber * limit,
            }, {transaction: this.transaction})
        }
        
        for (var i = 0; i < Penalties.length; i++) {
            Penalties[i] = Penalties[i].dataValues
            Penalties[i].Type = 'Penalty'
            Penalties[i].Origin = { ClientId: Penalties[i].OriginId, Name: await this.getName(Penalties[i].OriginId) }
            Penalties[i].Target = { ClientId: Penalties[i].TargetId, Name: await this.getName(Penalties[i].TargetId) }
        }

        for (var i = 0; i < Messages.length; i++) {
            Messages[i] = Messages[i].dataValues
            Messages[i].Type = 'Message'
        }

        Messages = Messages.concat(Penalties)

        Messages.sort((a,b) => {
            return (new Date(b.Date) - new Date(a.Date))
        })

        return Messages
    }

    async getName(ClientId) {
        if (this.clientCache.find(x => x && x.ClientId == ClientId))
            return this.clientCache.find(x => x && x.ClientId == ClientId).Name
        else {
            var Name = (await Models.NSMConnections.findAll({
                where: {
                    ClientId
                },
                attributes: ['Name']
            }))
            if (Name.length > 0) {
                this.clientCache[ClientId] = {ClientId: ClientId, Name: Name[0].dataValues.Name }
                return Name[0].dataValues.Name
            }
        }
    }

    async incrementStat(ClientId, Increment, Stat) {
        Models.NSMPlayerStats.update(
            { [Stat] : Sequelize.literal(`${Stat} + ${Increment}`)},
            {where: {ClientId: ClientId}}, {transaction: this.transaction})
        // await this.transaction.commit()
    }

    async editStat(ClientId, Value, Stat) {
        Models.NSMPlayerStats.update(
            { [Stat] : Value},
            {where: {ClientId: ClientId}}, {transaction: this.transaction})
        // await this.transaction.commit()
    }

    async logMessage(ClientId, Name, Hostname, Message) {
        var Kill = await Models.NSMMessages.build({
            OriginId: ClientId,
            Message,
            Name,
            Hostname
        }, {transaction: this.transaction}).save()
        // await this.transaction.commit()
        return Kill.dataValues
    }
}
module.exports = Database