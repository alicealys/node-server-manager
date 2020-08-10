const path      = require('path')
const Database = require(path.join(__dirname, '../Lib/InitDatabase.js'))
const db = new Database()

var Utils = {
    client: {
        convertFromStatus: async (client) => {
            var ClientId = await db.getClientId(client.guid)
            return {
                Name: client.name,
                ClientID: ClientId
            }
        }
    }
}
module.exports = Utils