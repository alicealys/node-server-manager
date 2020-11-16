module.exports = {
    Rcon: {
        prefix: '\xff\xff\xff\xffrcon %PASSWORD% %COMMAND%',
        status: 'status',
        getDvar: 'get %DVAR%',
        setDvar: 'set %DVAR% %VALUE%',
        clientKick: `clientkick %CLIENT% "%REASON%"`,
        Tell: `tell %CLIENT% "%MESSAGE%"`,
        Say: 'say "%MESSAGE%"',
        statusRegex: /^ +([0-9]+) +([0-9]+) +([0-9]+) +([0-9]+) +((?:[A-Za-z0-9]){8,32}|(?:[A-Za-z0-9]){8,32}|bot[0-9]+|(?:[[A-Za-z0-9]+)) *(.{0,32}) +([0-9]+) +(\d+\.\d+\.\d+.\d+\:-*\d{1,5}|0+.0+:-*\d{1,5}|loopback|unknown|bot) +(-*[0-9]+) +([0-9]+) *$/g,
        dvarRegex: /(.*?) +(is:|is) +\"(.*?)\"/g,
        parseStatus: (match, Utils, gamename) => {
            return {
                num: match[1],
                score: match[2],
                bot: match[3],
                ping: match[4],
                guid: Utils.convertGuid(match[5], gamename),
                name: match[6].replace(new RegExp(/\^([0-9]|\:|\;)/g, 'g'), ``),
                lastmgs: match[7],
                address: match[8],
                qport: match[9],
                rate: match[10]
            }
        },
        retries: 3
    },
    getInfo: '\xff\xff\xff\xffgetinfo',
    getStatus: '\xff\xff\xff\xffgetstatus',
    Dvars: {
        maxclients: 'sv_maxclients',
        mapname: 'mapname',
        hostname: 'sv_hostname',
        gamename: 'gamename',
        maprotation: 'sv_mapRotation',
        gametype: 'g_gametype',
        messagelength: 999999999,
        maxSayLength: 120
    }
}