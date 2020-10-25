const Sequelize         = require('sequelize')
const path              = require('path')
const Models            = require(path.join(__dirname, `../Lib/DatabaseModels.js`))
const Utils             = new (require(path.join(__dirname, '../Utils/Utils.js')))()
const Permissions       = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`)).Permissions
const Localization      = require(path.join(__dirname, `../Configuration/Localization-${process.env.LOCALE}.json`)).lookup

class Plugin {
  constructor(Server, Manager, Managers) {
    this.Server = Server
    this.Manager = Manager
    this.Managers = Managers
    this.Server.on('connect', this.onPlayerConnect.bind(this))
    this.Server.on('line', this.onLine.bind(this))
    this.init()
  }
  async onLine(line) {
    line = line.trim().replace(new RegExp(/([0-9]+:[0-9]+)\s+/g), '')
    if (this.isJson(line)) {
        var bankAction = JSON.parse(line)
        switch (bankAction.event) {
            case 'bank_withdraw':
                var Player = this.Server.Clients.find(Client => Client && Client.Guid == bankAction.player.Guid)
                Player && (await this.addPlayerMoney(Player.ClientId, -1 * bankAction.amount))
            break
            case 'bank_deposit':
                var Player = this.Server.Clients.find(Client => Client && Client.Guid == bankAction.player.Guid)
                Player && (await this.addPlayerMoney(Player.ClientId, bankAction.amount))
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
        Alias: 'w',
        logToAudit: false,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        callback: async (Player, args) => {
            if ((new Date() - Player.Data.lastWithdraw) / 1000 < 5) {
                Player.Tell(Localization['COMMAND_COOLDOWN'])
                return
            }

            var totalMoney = (await this.getZMStats(Player.ClientId)).Money
            var gameMoney = parseInt(await Player.Server.Rcon.getDvar(`${Player.Clientslot}_money`))
            var withdrawMoney = args[1] == 'all' ? Math.min(parseInt(totalMoney), 1000000 - gameMoney) : Math.min(parseInt(args[1]), 1000000 - gameMoney)
            switch (true) {
                case (!this.Server.Mapname.startsWith('zm_')):
                    Player.Tell(Localization['COMMAND_UNAVAILABLE_GAMETYPE'])
                return
                case (!Number.isInteger(withdrawMoney) || withdrawMoney < 0):
                    Player.Tell(Localization['ZBANK_PARSE_ERROR'])
                return
                case (totalMoney < withdrawMoney):
                    Player.Tell(Localization['ZBANK_BALANCE_ERROR']);
                return
            }
            var result = await Player.Server.Rcon.executeCommandAsync(`set bank_withdraw ${Player.Guid};${withdrawMoney}`)
            if (result) {
                Player.Data.lastWithdraw = new Date()
                this.setPlayerMoney(Player.ClientId, parseInt(totalMoney) - parseInt(withdrawMoney))
                Player.Tell(Utils.formatString(Localization['ZBANK_WITHDRAW_SUCCESS'], {amount: withdrawMoney}, '%')[0])
                return
            }
            Player.Tell(Localization['ZBANK_WITHDRAW_FAIL'])
        }
    }
    this.Manager.commands['deposit'] = {
        ArgumentLength: 1,
        Alias: 'd',
        logToAudit: false,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        callback: async (Player, args) => {
            if ((new Date() - Player.Data.lastDeposit) / 1000 < 5) {
                Player.Tell(Localization['COMMAND_COOLDOWN'])
                return
            }

            var totalMoney = (await this.getZMStats(Player.ClientId)).Money
            var gameMoney = parseInt(await Player.Server.Rcon.getDvar(`${Player.Clientslot}_money`))
            var depositMoney = args[1] == 'all' ? parseInt(gameMoney) : parseInt(args[1])
            switch (true) {
                case (!this.Server.Mapname.startsWith('zm_')):
                    Player.Tell(Localization['COMMAND_UNAVAILABLE_GAMETYPE'])
                return
                case (!Number.isInteger(depositMoney)):
                    Player.Tell(Localization['ZBANK_PARSE_ERROR'])
                return
                case (depositMoney <= 0):
                case (!gameMoney || !Number.isInteger(gameMoney) || gameMoney < depositMoney):
                    Player.Tell(Localization['ZBANK_BALANCE_ERROR'])
                return
            }
            var result = await Player.Server.Rcon.executeCommandAsync(`set bank_deposit ${Player.Guid};${depositMoney}`)
            if (result) {
                Player.Data.lastDeposit = new Date()
                Player.Tell(Utils.formatString(Localization['ZBANK_DEPOSIT_SUCCESS'], {amount: depositMoney}, '%')[0])
                this.setPlayerMoney(Player.ClientId, parseInt(totalMoney) + parseInt(depositMoney))
                return
            }

            Player.Tell(Localization['ZBANK_DEPOSIT_FAIL'])
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
                    Player.Tell(Localization['ZBANK_PARSE_ERROR'])
                return
                case (totalMoney < parseInt(moneyToGive * 1.05) && Player.Guid != 'Node'):
                    Player.Tell(Localization['ZBANK_BALANCE_ERROR'])
                return
            }

            await this.addPlayerMoney(Player.ClientId, -1 * parseInt(parseInt(moneyToGive) * 1.05))
            this.addPlayerMoney(Target.ClientId, parseInt(moneyToGive))
            Player.Tell(Utils.formatString(Localization['ZBANK_TRANSFER_FORMAT'], {amount: moneyToGive, name: Target.Name, fee: parseInt(moneyToGive * 0.05), id: Utils.getRandomInt(10000000, 90000000)}, '%')[0])
            Target.inGame = Utils.findClient(Target.ClientId, this.Managers)
            Target.inGame && Target.inGame.Tell(Utils.formatString(Localization['ZBANK_RECEIVE_FORMAT'], {amount: moneyToGive, name: Player.Name}, '%')[0])
        }
    }
    this.Manager.commands['money'] = {
        ArgumentLength: 0,
        inGame: false,
        Alias: 'balance',
        logToAudit: false,
        Permission: Permissions.Commands.COMMAND_USER_CMDS,
        callback: async (Player, args) => {
            if (args[1]) {
                var Client = await this.Server.getClient(args[1])
                if (!Client) {
                    Player.Tell(Utils.formatString(Localization['ZBANK_MONEY_FORMAT_SELF'], {amount: (await this.getZMStats(Player.ClientId)).Money}, '%')[0])
                    return
                }
                Player.Tell(Utils.formatString(Localization['ZBANK_MONEY_FORMAT'], {name: Client.Name, amount: (await this.getZMStats(Client.ClientId)).Money}, '%')[0])
            } else {
                Player.Tell(Utils.formatString(Localization['ZBANK_MONEY_FORMAT_SELF'], {amount: (await this.getZMStats(Player.ClientId)).Money}, '%')[0])
            }

        }
    }
  }

}
module.exports = Plugin