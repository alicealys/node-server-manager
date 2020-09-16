var commandPrefixes = {
    Rcon: {
        prefix: '\xff\xff\xff\xffrcon %PASSWORD% %COMMAND%',
        status: 'status',
        getDvar: 'get %DVAR%',
        setDvar: 'set %DVAR% %VALUE%',
        clientKick: `clientkick %CLIENT% "%REASON%"`,
        Tell: `tell %CLIENT% "%MESSAGE%"`,
    },
    getInfo: '\xff\xff\xff\xffgetinfo',
    getStatus: '\xff\xff\xff\xffgetstatus',
    Dvars: {
        maxclients: 'sv_maxclients',
        mapname: 'mapname',
        hostname: 'sv_hostname',
        gamename: 'gamename',
        maprotation: 'sv_mapRotation'
    }
}

module.exports = commandPrefixes