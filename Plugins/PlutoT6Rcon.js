class Plugin {
    constructor(Server, Manager) {
        this.Server = Server
        this.Manager = Manager
        this.commandPrefixes()
    }
    async commandPrefixes() {
        if (this.Server.Gamename != 'T6') return
        this.Server.Rcon.commandPrefixes = {
            Rcon: {
                prefix: '\xff\xff\xff\xffrcon %PASSWORD% %COMMAND%',
                status: 'status',
                getDvar: 'get %DVAR%',
                setDvar: 'set %DVAR% %VALUE%',
                clientKick: `clientkick_for_reason %CLIENT% "%REASON%"`,
                Tell: `tell %CLIENT% "%MESSAGE%"`,
            },
            getInfo: '\xff\xff\xff\xffgetinfo',
            getStatus: '\xff\xff\xff\xffgetstatus',
            Dvars: {
                maxclients: 'com_maxclients',
                mapname: 'mapname',
                hostname: 'sv_hostname',
                gametype: 'g_gametype',
                gamename: 'gamename',
                maprotation: 'sv_mapRotation',
                messagelength: 104
            }
        }
    }
}

module.exports = Plugin