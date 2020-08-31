const path              = require('path')
const config            = require(path.join(__dirname, `../Configuration/NSMConfiguration.json`))
const crypto            = require('crypto')

class SessionStore {
    constructor() {
        this.Sessions = []
    } 
    createSession(IPAddress) {
        var newSession = null
        this.Sessions.forEach(Session => {
            if (newSession) return
            if (Session.IPAddress == IPAddress && (new Date() - Session.Date) < config.sessionDuration * 1000 * 60 ) {
                newSession = {
                    ID: crypto.randomBytes(16).toString('hex'),
                    Date: new Date(),
                    IPAddress: IPAddress,
                    Data: Session.Data
                }
            }
        })
        if (!newSession) {
            newSession = {
                ID: crypto.randomBytes(16).toString('hex'),
                Date: new Date(),
                IPAddress: IPAddress,
                Data: {}
            }
        }
        this.Sessions.push(newSession)
        return newSession
    }
    getSession(ID) {
        var found = false
        this.Sessions.forEach(Session => {
            if (Session.ID == ID) {
                found = Session
            }
        })
        return found
    }
}

module.exports = SessionStore