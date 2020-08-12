const sqlite3           = require('sqlite3').verbose()
const Sequelize         = require('sequelize')
const path              = require('path');
const bcrypt            = require('bcrypt')
const { timeStamp }     = require('console')
const Models            = require('./DatabaseModels.js')

class Database {
    constructor () {}
    async addClient(Guid) {

        if (await this.getClientId(Guid)) return

        if (!(await this.getClientId('Node'))) {
            try {
                await Models.NSMClients.build({
                    Guid: 'Node'
                }).save()
            }
            catch (e) { }
        }

        var Client = await Models.NSMClients.build({
            Guid: Guid
        }).save()

        return Client.dataValues.ClientId
    }

    async initializeStats(ClientId) {
        if (!(await this.getPlayerStatsTotal(ClientId))) {
            await Models.NSMPlayerStats.build({
                ClientId: ClientId
            }).save()
        }
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
        })
        
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
        })
        
        return HitLoc.length > 0 ? HitLoc[0].dataValues.HitLoc : false
    }

    async getTotalDamage(ClientId) {
        var Damage = await Models.NSMKills.findAll({
            attributes: [[Sequelize.fn('sum', Sequelize.col('Damage')), 'totalDamage']],
            where: {
                TargetId: ClientId
            },
            group: ['BaseWeapon']
        })
        
        return Damage.length > 0 ? Damage[0].dataValues.totalDamage : false
    }

    async getPlayerKills(ClientId) {

        var Kills = await Models.NSMKills.findAll({
            where: {
                ClientId: ClientId
            }
        })

        return Kills.length
    }
    async getPlayerDeaths(ClientId) {

        var Deaths = await Models.NSMKills.findAll({
            where: {
                TargetId: ClientId
            }
        })

        return Deaths.length
    }

    async getOwner() {

        var Owner = await Models.NSMClients.findAll({
            where: {
                PermissionLevel: 5
            }
        })
        
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
        })
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
    async getClientLevel(ClientId) {

        var Level = await Models.NSMClients.findAll({
            arguments: ['PermissionLevel'],
            where: {
                ClientId: ClientId
            }
        })

        return Level[0].dataValues.PermissionLevel
    }

    async unbanClient(TargetId, OriginId, Reason) {
        var Penalties = await Models.NSMPenalties.update(
            { Active: false },
            { where: { TargetId: TargetId, Active: true } }
        )

        console.log(Penalties)

        Penalties.length > 0 && await Models.NSMPenalties.build({
            TargetId,
            OriginId,
            PenaltyType: 'PENALTY_UNBAN',
            Duration: 0,
            Reason: Reason
        })

        return Penalties[0]
    }

    async getClient(ClientId) {
        var Client = await Models.NSMClients.findAll({
            where: {
                ClientId: ClientId
            }
        })

        var Connection = await Models.NSMConnections.findAll({
            order: [
                ['Date', 'desc']
            ],
            limit: 1,
            where: {
                ClientId: ClientId
            }
        })

        if (Connection.length == 0) return false

        delete Client[0].dataValues.Password
        
        var Client = {...Client[0].dataValues, ...Connection[0].dataValues}

        return Client
    }

    async addPenalty(PenaltyMeta) {
        var Penalty = await Models.NSMPenalties.build(PenaltyMeta).save()
        return Penalty.dataValues
    }

    async setLevel(Player, Level) {
        Models.NSMClients.update(
            { PermissionLevel: Level },
            { where: { ClientId: Player.ClientId } }
        )
    }

    async getAllPenalties(ClientId = null) {
        var where = ClientId ? {
            where: {
                TargetId: ClientId,
            }
        } : null
        var Penalties = await Models.NSMPenalties.findAll(where)

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
            })
        }
        catch (e) {
            var Stats = await Models.NSMPlayerStats.findAll({
                limit: limit,
                order: [
                    ['Kills', 'desc']
                ],
                offset: limit * pageNumber
            })
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
        })

        return Fields.length > 0 ? Fields[0].dataValues[Field] : false
    }

    async setClientField(ClientId, Field, Value) {
        Models.NSMClients.update(
            { [Field] : Value},
            {where: {ClientId: ClientId}})
    }

    async getTokenHash(ClientId) {
        var Token = await Models.NSMTokens.findAll({
            where: {
                ClientId: ClientId
            }
        })
        return Token.length > 0 ? Token[0].dataValues : false
    }

    async createToken(ClientId, Token) {
        bcrypt.hash(Token, 10, async (err, hash) => {
            await Models.NSMTokens.destroy({
                where: {
                    ClientId: ClientId
                }
            })
            await Models.NSMTokens.build({
                ClientId: ClientId,
                Token: hash
            }).save()
        });
    }

    async getPlayerStatsTotal(ClientId) {
        var Stats = await Models.NSMPlayerStats.findAll({
            where: {
                ClientId: ClientId
            }
        })
        return Stats.length > 0 ? Stats[0].dataValues : false
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
    async getClientId(Guid) {

        var result = await Models.NSMClients.findAll({
            attributes: ['ClientId'],
            where: {
                Guid: Guid
            }
        })

        return result.length > 0 ? result[0].dataValues.ClientId : false
    }
    async logConnection(ePlayer) {
        var ClientId = await this.getClientId(ePlayer.Guid)
        
        var Connection = await Models.NSMConnections.build({
            ClientId: ClientId,
            IPAddress: ePlayer.IPAddress,
            Guid: ePlayer.Guid,
            Name: ePlayer.Name
        }).save()

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
        }).save()

        return Kill.dataValues
    }

    async getAllMessages(From, limit) {
        if (From) {
            var Messages = await Models.NSMMessages.findAll({
                where: {
                    OriginId: From
                },
                order: [
                    ['Date', 'desc']
                ],
            })
        } else {
            var Messages = await Models.NSMMessages.findAll({
                order: [
                    ['Date', 'desc']
                ],
            })
        }
        for (var i = 0; i < Messages.length; i++) {
            Messages[i] = Messages[i].dataValues
        }
        return Messages
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
            })
        } else {
            var Messages = await Models.NSMMessages.findAll({
                order: [
                    ['Date', 'desc']
                ],
                limit: limit,
                offset: pageNumber * limit,
            })
        }
        for (var i = 0; i < Messages.length; i++) {
            Messages[i] = Messages[i].dataValues
        }
        return Messages
    }

    async incrementStat(ClientId, Increment, Stat) {
        Models.NSMPlayerStats.update(
            { [Stat] : Sequelize.literal(`${Stat} + ${Increment}`)},
            {where: {ClientId: ClientId}})
    }

    async editStat(ClientId, Value, Stat) {
        Models.NSMPlayerStats.update(
            { [Stat] : Value},
            {where: {ClientId: ClientId}})
    }

    async logMessage(ClientId, Message) {
        var Kill = await Models.NSMMessages.build({
            OriginId: ClientId,
            Message: Message
        }).save()

        return Kill.dataValues
    }
}
module.exports = Database