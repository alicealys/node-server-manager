module.exports = {
    Rcon: {
        prefix: '\xff\xff\xff\xffrcon %PASSWORD% %COMMAND%',
        status: 'status',
        getDvar: '%DVAR%',
        setDvar: '%DVAR% %VALUE%',
        clientKick: `clientkick %CLIENT% "%REASON%"`,
        Tell: `tell %CLIENT% "%MESSAGE%"`,
        Say: `say "%MESSAGE%"`,
    },
    getInfo: '\xff\xff\xff\xffgetinfo',
    getStatus: '\xff\xff\xff\xffgetstatus',
    Dvars: {
        maxclients: 'sv_maxClients',
        mapname: 'mapname',
        hostname: 'sv_hostname',
        gametype: 'g_gametype',
        gamename: 'gamename',
        maprotation: 'sv_mapRotation',
        messagelength: 104
    }
}