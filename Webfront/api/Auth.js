const bcrypt            = require('bcrypt')
const twoFact           = require('node-2fa')

class Auth {
    constructor(db) {
        this.db = db
    }
    getSettings(ClientId) {

    }
    async Password(ClientId, Password) {
        //var tokenHash = await db.getTokenHash(req.session.ClientId)
        var passwordHash = await this.db.getClientField(ClientId, 'Password')
        if (!passwordHash) return false
        return new Promise((resolve, reject) => {
            bcrypt.compare(Password, passwordHash, (err, same) => {
                resolve(same)
            })
        })
    }
    async Token(ClientId, Token) {
        var tokenHash = await this.db.getTokenHash(ClientId)
        if (!tokenHash) return false
        return new Promise((resolve, reject) => {
            bcrypt.compare(Token, tokenHash.Token, (err, same) => {
                if (!same) {
                    resolve(false)
                    return
                }
                resolve (((new Date() - new Date(tokenHash.Date)) / 1000  < 120))
            })
        })
    }
    changePassword(newPassword) {
        bcrypt.hash(newPassword, 10, async (err, hash) => {
            await this.db.setClientField(ClientId, 'Password', hash)
        })
    }
    async twoFactor(ClientId, Token) {
        var Secret = await this.db.getClientField(ClientId, 'Secret')
        if (!Secret) return false

        var result = twoFact.verifyToken(Secret, Token)

        if (result)
            return result.delta == 0
        else {
            return false
        }
    }

}

module.exports = Auth