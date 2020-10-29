class Plugin {
    constructor(Managers) {
        this.DB = Managers[0].Server.DB
        this.addClientMeta()
    }
    async getZStats(ClientId) {
        var Stats = (await this.DB.Models.NSMZStats.findAll({where: ClientId})).map(x => x = x.dataValues)
        return Stats.length > 0 ? Stats[0] : false
    }
    async addClientMeta() {
        this.DB.clientProfileMeta.push(async (ClientId) => {
            var stats = await this.getZStats(ClientId)
            
            if (!stats || stats.Score <= 500) return {}

            return {
                name: 'Zombies Stats',
                data: {
                    'Kills': stats.Kills, 
                    'Downs': stats.Downs, 
                    'Revives': stats.Revives, 
                    'Highest Round': stats.HighestRound, 
                    'Headshots': stats.Headshots, 
                    'Score': stats.Score, 
                }
            }
        })
    }
}

module.exports = Plugin