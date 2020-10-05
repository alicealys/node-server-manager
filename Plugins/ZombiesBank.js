const Sequelize         = require('sequelize')
const path              = require('path')
const Models            = require(path.join(__dirname, `../Lib/DatabaseModels.js`))
const Utils             = new (require(path.join(__dirname, '../Utils/Utils.js')))()
const Permissions       = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`)).Permissions
const Localization      = require(path.join(__dirname, `../Configuration/Localization.json`)).lookup

class Plugin {
  constructor(Server, Manager, Managers) {
    this.Server = Server
    this.Manager = Manager
    this.Managers = Managers
    this.Server.on('connect', this.onPlayerConnect.bind(this))
    this.Server.on('map_loaded', this.onMapLoaded.bind(this))
    this.Server.on('line', this.onLine.bind(this))
    //setInterval(this.updatePlayerBalance.bind(this), 1000)
    this.init()
  }
  async onMapLoaded() {
      this.Server.Clients.forEach(Client => {
          if (!Client) return
          this.setBalanceDvar(Player)
      })
  }
  async onLine(line) {
    line = line.trim().replace(new RegExp(/([0-9]+:[0-9]+)\s+/g), '')
    if (this.isJson(line)) {
        var bankAction = JSON.parse(line)
        switch (bankAction.event) {
            case 'bank_withdraw':
                console.log(bankAction)
                var Player = this.Server.Clients.find(Client => Client.Guid == bankAction.player.Guid)
                //Player.bankActonQueue.push(-1 * bankAction.amount)
                console.log(await this.addPlayerMoney(Player.ClientId, -1 * bankAction.amount))
                this.setBalanceDvar(Player)
            break
            case 'bank_deposit':
                console.log(bankAction)
                var Player = this.Server.Clients.find(Client => Client.Guid == bankAction.player.Guid)
                //Player.bankActonQueue.push(bankAction.amount)
                console.log(await this.addPlayerMoney(Player.ClientId, bankAction.amount))
                this.setBalanceDvar(Player)
            break
        }
    }
  }
  isJson(data) {
    try {
        JSON.parse(data)
    }
    catch (e) {
        return false
    }
    return true
}
  async updatePlayerBalance() {
      this.Server.Clients.forEach(Client => {
          if (!Client || !Client.bankActionQueue.length) return

          this.addPlayerMoney(Client.ClientId, Utils.arraySum(Client.bankActionQueue))
      })
  }
  async onPlayerConnect(Player) {
    if (!(await this.getZMStats(Player.ClientId))) {
        await this.NSMZombiesStats.build({
            ClientId: Player.ClientId
        }).save()
    }
    Player.bankActonQueue = []
    this.setBalanceDvar(Player)
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
  async setBalanceDvar(Player) {
    if (!Player.Server) return
    Player.Server.Rcon.setDvar(`${Player.Guid}_balance`, (await this.getZMStats(Player.ClientId)).Money)
  }
  async addPlayerMoney(ClientId, Money) {
    return await this.NSMZombiesStats.update(
      {Money : Sequelize.literal(`Money + ${Money}`)},
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
            this.setBalanceDvar(Player)
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
            this.setBalanceDvar(Player)
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
                    Player.Tell(Localization['COMMAND_CLIENT_NOT_FOUND'])
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

            await this.addPlayerMoney(Player.ClientId, -1 * parseInt(parseInt(moneyToGive) * 1.05))
            this.addPlayerMoney(Target.ClientId, parseInt(moneyToGive))
            Player.Tell(`Successfully transfered ^2$${moneyToGive}^7 to ^5${Target.Name}^7's bank account! You payed a ^1$${parseInt(moneyToGive * 0.05)} ^7fee, Transaction ID: ^6#${Utils.getRandomInt(10000000, 90000000)}`)
            Target.inGame = Utils.findClient(Target.ClientId, this.Managers)
            Target.inGame && Target.inGame.Tell(`Received ^2$${moneyToGive}^7 from ^5${Player.Name}^7!`)
            this.setBalanceDvar(Player)
            Target.inGame && this.setBalanceDvar(Target.inGame)
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