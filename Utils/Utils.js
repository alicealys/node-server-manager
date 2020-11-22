const path        = require('path')
const Permissions = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`)).Permissions

class Utils {
    convertGuid(Guid, Gamename) {
        switch (Gamename) {
            case 'T6':
                return parseInt(Guid, 16).toString();
            default:
                return Guid;
        }
    }
    getRandomInt(min, max) {
        min = Math.ceil(min)
        max = Math.floor(max)
        return Math.floor(Math.random() * (max - min)) + min
    }
    findClient(ClientId, Managers) {
        var Client = null
        Managers.forEach(Manager => {
            if (Client) return
            Client = Manager.Server.Clients.find(x => x && x.ClientId == ClientId)
        })
        return Client
    }
    stripStringDiscord(string) {
        string = this.stripString(string)
        string = string.replace(new RegExp(/\|\s/g), '-')
        return string
    }
    stripString(string) {
        if (!string) return ''
        return string.toString().replace(new RegExp(/\^([0-9]|\:|\;)/g, 'g'), '')
    }
    secondsToDhms (seconds) {
        seconds = Number(seconds);
        var d = Math.floor(seconds / (3600*24))
        var h = Math.floor(seconds % (3600*24) / 3600)
        var m = Math.floor(seconds % 3600 / 60)
        var s = Math.floor(seconds % 60)
      
        var dDisplay = d > 0 ? d + (d == 1 ? ' day, ' : ' days, ') : ''
        var hDisplay = h > 0 ? h + (h == 1 ? ' hour, ' : ' hours, ') : ''
        var mDisplay = m > 0 ? m + (m == 1 ? ' minute, ' : ' minutes, ') : ''
        var sDisplay = s > 0 ? s + (s == 1 ? ' second' : ' seconds') : ''
        return dDisplay + hDisplay + mDisplay + sDisplay
    }
    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    str2bool(string) {
        return string ? string == '1' || string == 'true' : null
    }
    getRoleFrom (Value, Type) {
        switch (Type) {
          case 0:
            var RolesArray = Object.entries(Permissions.Roles)
            for (var i = 0; i < RolesArray.length; i++) {
              if (this.stripString(RolesArray[i][1].toLocaleLowerCase()) == this.stripString(Value.toLocaleLowerCase())) {
                return {
                  Name: RolesArray[i][1],
                  Level: Permissions.Levels[RolesArray[i][0]]
                }
              }
            }
          break;
          case 1:
            var RolesArray = Object.entries(Permissions.Levels)
            for (var i = 0; i < RolesArray.length; i++) {
              if (RolesArray[i][1] == Value) {
                return {
                  Name: Permissions.Roles[RolesArray[i][0]],
                  Level: RolesArray[i][1]
                }
              }
            }
          break
        }
        return false
    }
    getCommand(commands, name) {
        var found = false

        Object.entries(commands).forEach(command => {
            if (command[0].toLocaleLowerCase() == name.toLocaleLowerCase() || (command[1].Alias && command[1].Alias.toLocaleLowerCase() == name.toLocaleLowerCase())) {
                found = command[0]
            }
        })

        return found
    }
    formatString(template = '', values, c = '%') {
        Object.entries(values).forEach(value => {
            template = template.replace(new RegExp(`${c}${value[0].toLocaleUpperCase()}${c}`), value[1])
        })

        return template.split('\n')
    }
    time2str(secs) {
        var unit = 's'
        switch (true) {
            case (secs < 3600):
                  secs /= 60
                  unit = 'min'
            break
             case (secs >= 3600 && secs < 86400):
                  secs /= 3600
                  unit = 'h'
            break
            case (secs >= 86400):
                  secs /= 86400
                  unit = 'd'
            break
        }

        return `${secs.toFixed(1)}${unit}`
    }
    chunkArray (arr, len) {
        var chunks = []
        var i = 0
        var n = arr.length

        while (i < n) {
            chunks.push(arr.slice(i, i += len))
        }

        return chunks
    }
    chunkString(str, length) {
        return str.match(new RegExp('.{1,' + length + '}', 'g'));
    }
    va(format) {
        var args = Array.from(arguments)
        args.shift()

        for (var i = 0; i < args.length; i++) {
            format = format.replace(`%${(typeof args[i])[0]}`, args[i])
        }

        return format
    }
    breakString(str, length, char, chunks = []) {
        str = str.toString().replace(new RegExp(/\s+/g), ' ').trim()

        if (str.length <= length) {
            chunks.push(str.trim())
            return chunks
        }

        var index = str.lastIndexOf(char, length) >= 0 ? str.lastIndexOf(char, length) : length

        chunks.push(str.substr(0, index).trim())
        str = str.substr(index)

        return this.breakString(str, length, char, chunks)
    }
    ordinalSuffix(i) {
        var j = i % 10
        var k = i % 100

        if (j == 1 && k != 11) {
            return i + 'st';
        }

        if (j == 2 && k != 12) {
            return i + 'nd';
        }

        if (j == 3 && k != 13) {
            return i + 'rd';
        }

        return i + 'th';
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
    COD2BashColor(string) {
        return string.replace(new RegExp(/\^([0-9]|\:|\;)/g, 'g'), `\x1b[3$1m`)
    }
}

module.exports = Utils;