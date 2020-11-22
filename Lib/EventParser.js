class EventParser {
    constructor(Server) {
        this.Server = Server
    }
    getEventData(eventString) {
        eventString = eventString.trim().replace(/([0-9]+:[0-9]+)\s+/g, '$1;')

        var eventRegex = {
            say: /^([0-9]+:[0-9]+);(say|sayteam);(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0);([0-9]+);([^;]*);(.*)$/g,
            join: /^([0-9]+:[0-9]+);(J);(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0);([0-9]+);(.*)$/g,
            quit: /^([0-9]+:[0-9]+);(Q);(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0);([0-9]+);(.*)$/g,
            damage: /^([0-9]+:[0-9]+);(D);(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0);(-?[0-9]+);(axis|allies|world|none)?;([^;]{1,24});(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0)?;(-?[0-9]+);(axis|allies|world|none)?;([^;]{1,24})?;((?:[0-9]+|[a-z]+|_|\+)+);([0-9]+);((?:[A-Z]|_)+);((?:[a-z]|_)+)$/g,
            kill: /^([0-9]+:[0-9]+);(K);(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0);(-?[0-9]+);(axis|allies|world|none)?;([^;]{1,24});(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0)?;(-?[0-9]+);(axis|allies|world|none)?;([^;]{1,24})?;((?:[0-9]+|[a-z]+|_|\+)+);([0-9]+);((?:[A-Z]|_)+);((?:[a-z]|_)+)$/g,
            init: /^( +|)([0-9]+:[0-9]+);(InitGame|InitGame(.+))$/g
        }

        if (eventString.includes('InitGame')) {
            var lines = eventString.split('\n')
            for (var i = 0; i < lines.length; i++) {
                if (lines[i].trim().match(eventRegex.init)) {
                    var eventVars = lines[i].trim().split(';')
                    eventVars[0] = parseInt(eventVars[0].split(':')[0]) * 60 + parseInt(eventVars[0].split(':')[1])
                    eventData = { type: 'init', vars: eventVars }

                    return eventData
                }
            }
        }

        var eventData = { type: null, data: null }
        Object.entries(eventRegex).forEach((r) => {
            if (eventString.match(r[1])) {
                var eventVars = r[1].exec(eventString)
                eventVars[0] = parseInt(eventVars[0].split(':')[0]) * 60 + parseInt(eventVars[0].split(':')[1])
                eventData = { type: r[0], vars: eventVars }
            }
        })
        
        return eventData
    }
    parseEvent(eventString) {
        var eventData = this.getEventData(eventString)
        if (eventData.type == null) return

        var parsedEvent = { type: eventData.type, data: null }
        switch (eventData.type) {
            case 'init': {
                parsedEvent.data = {
                    TimeOffset: eventData.vars[0],
                }
            }
            break
            case 'say':
                parsedEvent.data = {
                    TimeOffset: eventData.vars[0],
                    Origin: this.Server.Clients[eventData.vars[4]],
                    Message: eventData.vars[6].replace(/[^\x20-\x7E]+/g, '')
                }
            break
            case 'quit':
            case 'join':
                parsedEvent.data = {
                    TimeOffset: eventData.vars[0],
                    Origin: {
                        Guid: eventData.vars[3],
                        Clientslot: eventData.vars[4],
                        Name: eventData.vars[5].replace(/\[.*\]/g, '')
                    },
                }
            break
            case 'kill':
                var Weapon = eventData.vars[11]
                var BaseWeapon = Weapon
                if (Weapon.indexOf('_mp') > 0) {
                    BaseWeapon = Weapon.substr(0, Weapon.indexOf('_mp'))
                }
                var suicide = eventData.vars[4] == eventData.vars[8]
                parsedEvent.data = {
                    TimeOffset: eventData.vars[0],
                    Target: this.Server.Clients[eventData.vars[4]],
                    Origin: suicide ? {ClientId: 1} : this.Server.Clients[eventData.vars[8]],
                    Attack: {
                        Weapon: eventData.vars[11],
                        Damage: eventData.vars[12],
                        MOD: eventData.vars[13],
                        HitLoc: eventData.vars[14],
                        BaseWeapon: BaseWeapon
                    }
                } 
            break
        }
        
        return parsedEvent
    }
}

module.exports = EventParser