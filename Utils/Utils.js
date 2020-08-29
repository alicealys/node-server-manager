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