class ChaiscriptApi {
    constructor(Server) {
        this.Server = Server
        this.dvarNumber = 0
    }
    async eval(code) {
        return new Promise(async (resolve, reject) => {
            this.dvarNumber = this.dvarNumber > 20 ? 0 : this.dvarNumber

            var dvarNumber = this.dvarNumber++

            await this.Server.Rcon.setDvar(`chai_${dvarNumber}`, `${code.trim()}`)
            var onLine = (line) => {
                if (line.match(new RegExp(`chai_${dvarNumber};(.)+`))) {
                    resolve(line.substr(`chai_${dvarNumber};`.length))
                }
                this.Server.removeListener('line', onLine)
            }

            setTimeout(() => {
                resolve(null)
            }, 1000)

            this.Server.on('stripped_line', onLine)
        })

    }
}

class ChaiPlayer {
    constructor(Server, Clientslot) {
        this.Clientslot = Clientslot
        this.Server = Server
    }
    async iPrintLn(string) {
        this.Server.chai.eval(`gsc.getEntByNum(${this.Clientslot}).iPrintLn(\\"${string}\\")`)
    }
    async iPrintLnBold(string) {
        this.Server.chai.eval(`gsc.getEntByNum(${this.Clientslot}).iPrintLnBold(\\"${string}\\")`)
    }
    async setOrigin(vec) {
        this.Server.chai.eval(`gsc.getEntByNum(${this.Clientslot}).setOrigin(${JSON.stringify(vec)})`)
    }
    async getCurrentWeapon() {
        var weapon = await this.Server.chai.eval(`gsc.logPrint(header + to_string(gsc.getEntByNum(${this.Clientslot}).getCurrentWeapon()) + newline)`)
        return weapon
    }
    async switchToWeapon(weapon) {
        await this.Server.chai.eval(`gsc.logPrint(header + to_string(gsc.getEntByNum(${this.Clientslot}).switchToWeapon(${weapon})) + newline)`)
    }
    async takeWeapon(weapon) {
        await this.Server.chai.eval(`gsc.logPrint(header + to_string(gsc.getEntByNum(${this.Clientslot}).takeWeapon(${weapon})) + newline)`)
    }
    async giveMaxAmmo(weapon) {
        await this.Server.chai.eval(`gsc.logPrint(header + to_string(gsc.getEntByNum(${this.Clientslot}).giveMaxAmmo(${weapon})) + newline)`)
    }
    async forceGiveWeapon(weapon) {
        await this.Server.chai.eval(`var player = gsc.getEntByNum(${this.Clientslot});player.giveWeapon(\\"${weapon}\\");player.switchToWeapon(\\"${weapon}\\");player.giveMaxAmmo(\\"${weapon}\\")`)
    }
    async giveWeapon(weapon) {
        var weapon = await this.Server.chai.eval(`gsc.logPrint(header + to_string(gsc.getEntByNum(${this.Clientslot}).giveWeapon(${weapon})) + newline)`)
        return weapon
    }
    async getOrigin() {
        try {
            var origin = JSON.parse(await this.Server.chai.eval(`gsc.logPrint(header + to_string(gsc.getEntByNum(${this.Clientslot}).getOrigin()) + newline)`))
            return origin
        }
        catch (e) {
            return null
        }
    }
    async entEval(code, log) {
        return log ? await this.Server.chai.eval(`gsc.logPrint(header + to_string(gsc.getEntByNum(${this.Clientslot}).${code}) + newline)`) : await this.Server.chai.eval(`gsc.getEntByNum(${this.Clientslot}).${code}`)
    }
}

module.exports = { ChaiPlayer, ChaiscriptApi }