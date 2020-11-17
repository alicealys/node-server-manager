module.exports = (app, db) => {
    app.get('/api/ismuted', async (req, res, next) => {
        if (!req.query.guid) {
            res.end(JSON.stringify({
                error: true
            }))
            return
        }

        var Client = await db.getClientByGuid(req.query.guid)

        if (!Client) {
            res.end(JSON.stringify({
                error: true
            }))
            return
        }

        var playerPenalties = await db.getAllPenalties(Client.ClientId)

        for (var i = 0; i < playerPenalties.length; i++) {
            switch (playerPenalties[i].PenaltyType) {
                case 'PENALTY_MUTE':
                    var dateDiff = (new Date(playerPenalties[i].Date) - new Date()) / 1000

                    if (dateDiff + playerPenalties[i].Duration > 0 && playerPenalties[i].Active) {
                        res.end(JSON.stringify({
                            muted: true,
                            error: false,
                            reason: playerPenalties[i].Reason
                        }))

                        return
                    }
                break
            }
        }

        res.end(JSON.stringify({
            error: false,
            muted: false
        }))
    })
}