const sqlite3           = require('sqlite3').verbose()
const Sequelize         = require('sequelize')
const path              = require('path')
const Models            = require(path.join(__dirname, `../Lib/DatabaseModels.js`))
const Database  = require(path.join(__dirname, '../Lib/InitDatabase.js'))
const db = new Database()

const Permissions = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`)).Permissions

class Plugin {
  constructor(Server, Manager) {
    this.Server = Server
    this.Manager = Manager
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
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        callback: async (Player, args) => {
            var totalMoney = (await this.getZMStats(Player.ClientId)).Money
            var withdrawMoney = args[1] == 'all' ? parseInt(totalMoney) : parseInt(args[1])
            switch (true) {
                case (!Number.isInteger(withdrawMoney)):
                    Player.Tell(`Could not parse value`)
                return
                case (totalMoney < withdrawMoney):
                    Player.Tell(`Insufficient funds`);
                return
            }
            this.setPlayerMoney(Player.ClientId, parseInt(totalMoney - withdrawMoney))
            Player.Tell(`Successfully withdrew ^2$${withdrawMoney}^7 from your bank account!`)
            await Player.Server.Rcon.executeCommandAsync(`set bank_withdraw ${Player.Clientslot};${withdrawMoney}`)
        }
    }
    this.Manager.commands['deposit'] = {
        ArgumentLength: 1,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        callback: async (Player, args) => {
            
            var totalMoney = await Player.Server.Rcon.getDvar(`${Player.Clientslot}_money`)
            var depositMoney = args[1] == 'all' ? parseInt(totalMoney) : parseInt(args[1])
            switch (true) {
                case (!Number.isInteger(depositMoney)):
                    Player.Tell(`Could not parse value`)
                return
                case (depositMoney <= 0):
                case (totalMoney < depositMoney):
                    Player.Tell(`Insufficient funds`);
                return
            }
            Player.Tell(`Successfully deposited ^2$${depositMoney}^7 into your bank account!`)
            this.setPlayerMoney(Player.ClientId, parseInt(totalMoney + depositMoney))
            await Player.Server.Rcon.executeCommandAsync(`set bank_deposit ${Player.Clientslot};${depositMoney}`)
        }
    }
    this.Manager.commands['money'] = {
        ArgumentLength: 0,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        callback: async (Player, args) => {
            var money = await Player.Server.Rcon.getDvar(`${Player.Clientslot}_money`);
            Player.Tell(`You have a total of: ^2$${(await this.getZMStats(Player.ClientId)).Money}^7 in your bank account`)
        }
    }

  }
}
module.exports = Plugin