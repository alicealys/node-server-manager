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
    secondsToDhms (seconds) {
      seconds = Number(seconds);
      var d = Math.floor(seconds / (3600*24));
      var h = Math.floor(seconds % (3600*24) / 3600);
      var m = Math.floor(seconds % 3600 / 60);
      var s = Math.floor(seconds % 60);
      
      var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
      var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
      var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
      var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
      return dDisplay + hDisplay + mDisplay + sDisplay;
    }
    capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
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
        var found = false
        Object.entries(commands).forEach(command => {
          if (command[0].toLocaleLowerCase() == name.toLocaleLowerCase() || (command[1].Alias && command[1].Alias.toLocaleLowerCase() == name.toLocaleLowerCase())) {
            found = command[0]
          }
        })
        return found
      }
      formatString(template = '', values, c) {
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