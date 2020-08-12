class Plugin {
    constructor(Server, Manager) {
        this.Server = Server
        this.Manager = Manager
        this.Server.on('connect', this.onPlayerConnect.bind(this))
    }
    async onPlayerConnect (Player) {
        var playerPenalties = await this.Server.DB.getAllPenalties(Player.ClientId)
        for (var i = 0; i < playerPenalties.length; i++) {
            switch (playerPenalties[i].PenaltyType) {
                case 'PENALTY_PERMA_BAN':
                    playerPenalties[i].Active && Player.Kick(`Banned for: ^5${playerPenalties[i].Reason}`, 1)
                return
                case 'PENALTY_TEMP_BAN':
                    var dateDiff = (new Date(playerPenalties[i].Date) - new Date()) / 1000
                    if (dateDiff + playerPenalties[i].Duration > 0) {
                        playerPenalties[i].Active && Player.Kick(`Banned for: ^5${playerPenalties[i].Reason}^7 ${this.secondsToDhms(dateDiff + playerPenalties[i].Duration)} left`, 1)
                        return
                    }
                break
            }
        }
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
}
module.exports = Plugin