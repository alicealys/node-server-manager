const sqlite3           = require('sqlite3').verbose()
const Sequelize         = require('sequelize')
const path              = require('path')
const Models            = require(path.join(__dirname, `../Lib/DatabaseModels.js`))
const Database  = require(path.join(__dirname, '../Lib/InitDatabase.js'))
const db = new Database()
const _utils            = require(path.join(__dirname, '../Utils/Utils.js'))
const Utils             = new _utils()

const Permissions = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`)).Permissions

class Plugin {
  constructor(Server, Manager, Managers) {
    this.Server = Server
    this.Manager = Manager
    this.Managers = Managers
    this.Server.on('connect', this.onPlayerConnect.bind(this))
    this.init()
  }
  async onPlayerConnect(Player) {
    if ((await this.getZMStats(Player.ClientId))) return
    await this.NSMZombiesStats.build({
        ClientId: Player.ClientId
    }).save()
  }
  async createTable() {
    this.NSMZombiesStats = Models.DB.define('NSMZombiesStats', 
    {
        ClientId: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true,
            references: {
                model: 'NSMClients',
                key: 'ClientId'
            }
        },
        Money: {
            type: Sequelize.INTEGER,
            defaultValue: 0,
            allowNull: false
        },
        LockerWeapon: {
            type: Sequelize.TEXT,
            defaultValue: 'none',
            allowNull: false
        }   
    }, {
        timestamps: false
    })
    this.NSMZombiesStats.sync()
  }
  async getZMStats(ClientId) {
      if (ClientId == 1) {
          return {
              Money: Infinity,
              LockerWeapon: 'none'
          }
      }
    var ZMStats = await this.NSMZombiesStats.findAll({
        where: {
            ClientId: ClientId
        }
    })
    return ZMStats.length > 0 ?ZMStats[0].dataValues : false
  }
  async setPlayerMoney(ClientId, Money) {
      await this.NSMZombiesStats.update(
        {Money : Money},
        {where: {ClientId: ClientId}})
  }
  async init () {
    await this.createTable()
    this.Manager.commands['withdraw'] = {
        ArgumentLength: 1,
        logToAudit: false,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        callback: async (Player, args) => {
            var totalMoney = (await this.getZMStats(Player.ClientId)).Money
            var gameMoney = parseInt(await Player.Server.Rcon.getDvar(`${Player.Clientslot}_money`))
            var withdrawMoney = args[1] == 'all' ? Math.min(parseInt(totalMoney), 1000000 - gameMoney) : Math.min(parseInt(args[1]), 1000000 - gameMoney)
            switch (true) {
                case (!this.Server.Mapname.startsWith('zm_')):
                    Player.Tell(`This command is not available in this gamemode`)
                return
                case (!Number.isInteger(withdrawMoney) || withdrawMoney < 0):
                    Player.Tell(`Could not parse value`)
                return
                case (totalMoney < withdrawMoney):
                    Player.Tell(`Insufficient funds`);
                return
            }
            this.setPlayerMoney(Player.ClientId, parseInt(totalMoney) - parseInt(withdrawMoney))
            Player.Tell(`Successfully withdrew ^2$${withdrawMoney}^7 from your bank account!`)
            await Player.Server.Rcon.executeCommandAsync(`set bank_withdraw ${Player.Guid};${withdrawMoney}`)
        }
    }
    this.Manager.commands['deposit'] = {
        ArgumentLength: 1,
        logToAudit: false,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        callback: async (Player, args) => {
            var totalMoney = (await this.getZMStats(Player.ClientId)).Money
            var gameMoney = parseInt(await Player.Server.Rcon.getDvar(`${Player.Clientslot}_money`))
            var depositMoney = args[1] == 'all' ? parseInt(gameMoney) : parseInt(args[1])
            switch (true) {
                case (!this.Server.Mapname.startsWith('zm_')):
                    Player.Tell(`This command is not available in this gamemode`)
                return
                case (!Number.isInteger(depositMoney)):
                    Player.Tell(`Could not parse value`)
                return
                case (depositMoney <= 0):
                case (gameMoney < depositMoney):
                    Player.Tell(`Insufficient funds`)
                return
            }
            Player.Tell(`Successfully deposited ^2$${depositMoney}^7 into your bank account!`)
            this.setPlayerMoney(Player.ClientId, parseInt(totalMoney) + parseInt(depositMoney))
            await Player.Server.Rcon.executeCommandAsync(`set bank_deposit ${Player.Guid};${depositMoney}`)
        }
    }
    this.Manager.commands['pay'] = {
        ArgumentLength: 2,
        inGame: false,
        logToAudit: false,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        callback: async (Player, args) => {
            var Target = await this.Server.getClient(args[1])
            switch (true) {
                case (!Target):
                    Player.Tell('Client not found')
                return
            }
            var totalMoney = (await this.getZMStats(Player.ClientId)).Money
            var moneyToGive = parseInt(args[2])
            switch (true) {
                case (!Number.isInteger(moneyToGive) || moneyToGive < 0):
                    Player.Tell(`Could not parse value`)
                return
                case (totalMoney < parseInt(moneyToGive * 1.05) && Player.Guid != 'Node'):
                    Player.Tell(`Insufficient funds`)
                return
            }
            Target.totalMoney = (await this.getZMStats(Target.ClientId)).Money
            await this.setPlayerMoney(Player.ClientId, parseInt(totalMoney) - parseInt(parseInt(moneyToGive) * 1.05))
            this.setPlayerMoney(Target.ClientId, parseInt(Target.totalMoney) + parseInt(moneyToGive))
            Player.Tell(`Successfully transfered ^2$${moneyToGive}^7 to ^5${Target.Name}^7's bank account! You payed a ^1$${parseInt(moneyToGive * 0.05)} ^7fee, Transaction ID: ^6#${Utils.getRandomInt(10000000, 90000000)}`)
            Target.inGame = Utils.findClient(Target.ClientId, this.Managers)
            Target.inGame && Target.inGame.Tell(`Received ^2$${moneyToGive}^7 from ^5${Player.Name}^7!`)
        }
    }
    this.Manager.commands['money'] = {
        ArgumentLength: 0,
        inGame: false,
        logToAudit: false,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        callback: async (Player, args) => {
            if (args[1]) {
                var Client = await this.Server.getClient(args[1])
                if (!Client) {
                    Player.Tell(`You have a total of: ^2$${(await this.getZMStats(Player.ClientId)).Money}^7 in your bank account`)
                    return
                }
                Player.Tell(`^5${Client.Name}^7 has a total of: ^2$${(await this.getZMStats(Client.ClientId)).Money}^7 in their bank account`)
            } else {
                Player.Tell(`You have a total of: ^2$${(await this.getZMStats(Player.ClientId)).Money}^7 in your bank account`)
            }

        }
    }
  }

}
module.exports = Plugin