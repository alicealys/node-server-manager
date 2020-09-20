const path              = require('path')
const fs                = require('fs')
const Utils             = new (require(path.join(__dirname, '../../Utils/Utils.js')))()
const configName        = path.join(__dirname, `../../Configuration/NSMConfiguration.json`)
var config              = require(configName)

fs.watch(path.join(__dirname, `../../Configuration/NSMConfiguration.json`), async (filename) => {
    if (filename) {
        try { var newData = require(configName) }
        catch (e) { 
            console.log(`Failed to reload config file ${configName}: ${e.toString()}`); return }

        config = newData
        console.log(`Reloaded config file ${configName}`)
    }
})

class Plugin {
    constructor(Managers) {
        this.Managers = Managers
        this.autoMessages()
    }
    autoMessages() {
        setInterval(async () => {
            var index = Utils.getRandomInt(0, config.autoMessages.length)
            var Message = await this.replacePlaceholders(config.autoMessages[index])
            this.Managers.forEach(Manager => {
                Manager.Server.Broadcast(Message)
            })
        }, config.autoMessagesInterval * 1000);
    }
    async replacePlaceholders(text) {
        var placeholders = {
            'TOTALCLIENTS' : {
                async get() {
                    return (await placeholders.Managers[0].Server.DB.getAllClients()).length
                }
            },
            'PLAYERCOUNT': {
                async get() {
                    var count = 0;
                    var Managers = placeholders.Managers.concat()
                    Managers.forEach(Manager => {
                        count += Manager.Server.Clients.filter((x) => { return x }).length
                    })
                    return count
                }
            },
            'SERVERCOUNT': {
                async get() {
                    var Managers = placeholders.Managers.concat()
                    return Managers.filter((Manager) => { return Manager.Server.Mapname} ).length
                }
            },
            'TOTALKILLS': {
                async get() {
                    return (await placeholders.Managers[0].Server.DB.getGlobalStats()).totalKills
                }
            },
            'TOTALPLAYEDTIME': {
                async get() {
                    return parseInt(((await placeholders.Managers[0].Server.DB.getGlobalStats()).totalPlayedTime) / 60)
                }
            }
        }
        placeholders.Managers = this.Managers
        var entries = Object.entries(placeholders)

        text = text.split(/\s+/g)

        for (var i = 0; i < text.length; i++) {
            for (var o = 0; o < entries.length; o++) {
                if (text[i].includes(`{${entries[o][0]}}`)) {
                    text[i] = text[i].replace(`{${entries[o][0]}}`, (await entries[o][1].get()))
                }
            }
        }

        return text.join(' ')
    }
    
    ordinalSuffix(i) {
        var j = i % 10,
            k = i % 100;
        if (j == 1 && k != 11) {
            return i + "st";
        }
        if (j == 2 && k != 12) {
            return i + "nd";
        }
        if (j == 3 && k != 13) {
            return i + "rd";
        }
        return i + "th";
    }
}
module.exports = Plugin