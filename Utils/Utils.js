class Utils {
    convertGuid(Guid, Gamename) {
        switch (Gamename) {
            case 'T6':
                return parseInt(Guid, 16).toString();
            default:
                return Guid;
        }
    }
}
module.exports = Utils;