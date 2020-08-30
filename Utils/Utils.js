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
    getRoleFrom (Value, Type) {
        switch (Type) {
          case 0:
            var RolesArray = Object.entries(Permissions.Roles)
            for (var i = 0; i < RolesArray.length; i++) {
              if (RolesArray[i][1].toLocaleLowerCase() == Value.toLocaleLowerCase()) {
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
          break;
        }
        return false
      }
      getCommand(commands, name) {
        var found = name
        Object.entries(commands).forEach(command => {
          if (command[0].toLocaleLowerCase() == name.toLocaleLowerCase() || (command[1].Alias && command[1].Alias.toLocaleLowerCase() == name.toLocaleLowerCase())) {
            found = command[0]
          }
        })
        return found
      }
      parseStatusLine(line, Gamename) {
        var reverse = line.split('').reverse().join('')
        // reverses the line and splits it until the 4th space (which should be the space right after the end of the name)
        var arr = reverse.split(/\s+/g)
        var result = arr.splice(0, 4)
        result.push(arr.join(' '))
        var address = result[2].split('').reverse().join('') // unreverse the ip
        var vars = result[4].split('').reverse().join('').split(/\s+/g).filter((x) => { return x.length })
        var name = vars.splice(5).join(' ').replace(new RegExp(/\^([0-9]|\:|\;)/g, 'g'), ``)
        return {
            num: vars[0],
            score: vars[1],
            bot: vars[2],
            ping: vars[3],
            guid: this.convertGuid(vars[4], Gamename),
            name: name,
            address: address
        }
    }
      chunkArray (arr, len) {

        var chunks = [],
            i = 0,
            n = arr.length;

        while (i < n) {
            chunks.push(arr.slice(i, i += len));
        }

        return chunks;
    }
}
module.exports = Utils;