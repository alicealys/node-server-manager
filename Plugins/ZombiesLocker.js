const path              = require('path')
const Utils             = new (require(path.join(__dirname, '../Utils/Utils.js')))()
const Localization      = require(path.join(__dirname, `../Configuration/Localization-${process.env.LOCALE}.json`)).lookup
const { Command }       = require(path.join(__dirname, `../Lib/Classes.js`))
const wait              = require('delay')
const Sequelize         = require('sequelize')

class Plugin {
    constructor(Server, Manager, Managers) {
        this.Server = Server
        this.Manager = Manager
        this.Managers = Managers
        this.lockerCost = 100000
        this.defaultLockerSize = 1
        this.Server.on('preconnect', this.onPlayerConnect.bind(this))
        this.Server.on('connect', this.onPlayerConnect.bind(this))
        this.Server.on('line', this.onLine.bind(this))
        this.Server.on('dvars_loaded', this.init.bind(this))
    }
    async onLine(line) {
        line = line.trim().replace(new RegExp(/([0-9]+:[0-9]+)\s+/g), '')
        if (Utils.isJson(line)) {
            var lockerEvent = JSON.parse(line)

            switch (lockerEvent.event) {
                case 'locker_set':
                    if (!lockerEvent.player) return

                    var Player = this.Server.Clients.find(c => c.Guid == lockerEvent.player.Guid)
                    
                    if (!Player) return

                    if (!lockerEvent.weapondata) {
                        Player.getSelectedLocker().weaponData = {}
                        Player.updateLocker()
                        return
                    }

                    Player.getSelectedLocker().weaponData = lockerEvent.weapondata
                    Player.updateLocker()
                break
            }
        }
    }
    async onPlayerConnect(Player) {
        var locker = await this.Server.DB.metaService.getPersistentMeta('locker', Player.ClientId)

        if (!locker || !locker.Value) {
            locker = {}
            locker.Value = {
                weapons: (new Array(this.defaultLockerSize)).fill({
                    weaponData: {},
                    selected: false
                })
            }

            locker.Value.weapons[0].selected = true
            locker.Value = JSON.stringify(locker.Value)

            await this.Server.DB.metaService.addPersistentMeta('locker', locker.Value, Player.ClientId)
        }

        Player.locker = JSON.parse(locker.Value)
        Player.getSelectedLocker = () => {
            return Player.locker.weapons.find(w => w && w.selected)
        }

        Player.updateLocker = () => {
            this.Server.DB.metaService.addPersistentMeta('locker', JSON.stringify(Player.locker), Player.ClientId)
            var value = Object.values(Player.getSelectedLocker().weaponData).length 
                ? Object.values(Player.getSelectedLocker().weaponData).toString() 
                : 'undefined'

            this.Server.Rcon.setDvar(`${Player.Guid}_update`, value)
            this.Server.Rcon.setDvar(`${Player.Guid}_weapondata`, value)
        }

        if (!Utils.isJson(locker.Value) || !Player.getSelectedLocker().weaponData) {
            this.Server.Rcon.setDvar(`${Player.Guid}_weapondata`, 'undefined')
            return
        }

        this.Server.Rcon.setDvar(`${Player.Guid}_weapondata`, Object.values(Player.getSelectedLocker().weaponData).toString())
    }
    async addPlayerMoney(ClientId, Money) {
        return await this.Server.DB.Models.NSMZombiesStats.update(
            {Money : Sequelize.literal(`Money + ${Money}`)},
            {where: {ClientId: ClientId}})
    }
    async getPlayerMoney(ClientId) {
        return (await this.Server.DB.Models.NSMZombiesStats.findAll({
            where: {
                ClientId
            },
            raw: true
        }))[0].Money
    }
    async init () {
        var buyLocker = new Command()
        .setName('buylocker')
        .addCallback(async (Player) => {
            if (!this.Server.DB.Models.NSMZombiesStats) {
                return
            }
            
            var cost = this.lockerCost * Math.pow(2, Player.locker.weapons.length)

            if ((await this.getPlayerMoney(Player.ClientId)) < cost) {
                Player.Tell(Localization['ZBANK_BALANCE_ERROR'])
                return
            }

            await this.addPlayerMoney(Player.ClientId, cost * -1)

            Player.locker.weapons.push({
                weaponData: {},
                selected: false
            })

            Player.updateLocker()
            Player.Tell(Utils.formatString(Localization['LOCKER_PURCHASE_SUCCESS'], {cost}, '%')[0])
        })
        
        if (this.Server.Gametype == 'zclassic')
        this.Manager.Commands.add(buyLocker)

        var lockerCmd = new Command()
        .setName('locker')
        .addParam({
            name: 'slot',
            optional: true
        })
        .addCallback(async (Player, params) => {
            if (params.slot) {
                params.slot = parseInt(params.slot)

                if (Player.locker.weapons[params.slot] == undefined) {
                    Player.Tell(Localization['LOCKER_INVALID_SLOT'])
                    return
                }

                for (var i = 0; i < Player.locker.weapons.length; i++) {
                    Player.locker.weapons[i].selected = false
                }

                Player.Tell(Player.locker.weapons[params.slot].weaponData.name 
                    ? Utils.formatString(Localization['LOCKER_SELECT_SLOT'], {
                        slot: params.slot, 
                        weaponName: Player.locker.weapons[params.slot].weaponData.name, 
                        clip: Player.locker.weapons[params.slot].weaponData.clip, 
                        stock: Player.locker.weapons[params.slot].weaponData.stock
                    }, '%')[0]
                    : Utils.formatString(Localization['LOCKER_SELECT_SLOT_EMPTY'], {slot: params.slot}, '%')[0])

                Player.locker.weapons[params.slot].selected = true
                Player.updateLocker()
                return
            }

            for (var i = 0; i < Player.locker.weapons.length; i++) {
                Player.locker.weapons[i] && Player.locker.weapons[i].weaponData.name
                    ? Player.Tell(Utils.formatString(Localization['COMMAND_LOCKER_FORMAT'], {
                        weaponName: Player.locker.weapons[i].weaponData.name,
                        clip: Player.locker.weapons[i].weaponData.clip,
                        stock: Player.locker.weapons[i].weaponData.stock,
                        slot: i,
                        color: Player.locker.weapons[i].selected ? '^2' : '^7'
                    }, '%')[0])
                    : Player.Tell(Utils.formatString(Localization['LOCKER_SLOT_EMPTY'], {
                        color: Player.locker.weapons[i].selected ? '^2' : '^7', 
                        slot: i
                    }, '%')[0])
                await wait(500)
            }

            Player.Tell(Utils.formatString(Localization['LOCKER_UNK_SLOT'], { cost: this.lockerCost * Math.pow(2, Player.locker.weapons.length) }, '%')[0])
        })
        if (this.Server.Gametype == 'zclassic')
            this.Manager.Commands.add(lockerCmd)
    }
}
module.exports = Plugin