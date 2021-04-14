class EventParser {
    constructor(Server) {
        this.Server = Server
    }

    parseTimeStamp(timeStamp) {
        if (timeStamp.includes(':')) {
            const split = timeStamp.split(':')
    
            return parseInt(split[0]) * 60 + parseInt(split[1])
        }
    
        if (!this.Server.startTime) {
            this.Server.startTime = parseInt(timeStamp)
        }
    
        return parseInt(timeStamp) - this.Server.startTime
    }

    getEventData(eventString) {
        eventString = eventString.trim()

        var eventRegex = {
            say: /^(.+) (say|sayteam);(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0);([0-9]+);([^;]*);(.*)$/g,
            join: /^(.+) (J);(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0);([0-9]+);(.*)$/g,
            quit: /^(.+) (Q);(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0);([0-9]+);(.*)$/g,
            damage: /^(.+) (D);(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0);(-?[0-9]+);(axis|allies|world|none)?;([^;]{1,24});(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0)?;(-?[0-9]+);(axis|allies|world|none)?;([^;]{1,24})?;((?:[0-9]+|[a-z]+|_|\+)+);([0-9]+);((?:[A-Z]|_)+);((?:[a-z]|_)+)$/g,
            kill: /^(.+) (K);(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0);(-?[0-9]+);(axis|allies|world|none)?;([^;]{1,24});(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0)?;(-?[0-9]+);(axis|allies|world|none)?;([^;]{1,24})?;((?:[0-9]+|[a-z]+|_|\+)+);([0-9]+);((?:[A-Z]|_)+);((?:[a-z]|_)+)$/g,
            init: /^( +|)(.+) (InitGame|InitGame(.+))$/g
        }

        var eventData = { type: null, data: null }
        Object.entries(eventRegex).forEach((r) => {
            if (!eventString.match(r[1])) {
                return
            }

            var eventVars = r[1].exec(eventString)
            eventVars[0] = this.parseTimeStamp(eventVars[0])
            
            eventData = { type: r[0], vars: eventVars }
        })
        
        return eventData
    }

    parseEvent(eventString) {
        var eventData = this.getEventData(eventString)
        if (!eventData || eventData.type == null) return

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
                        Guid: this.Server.Rcon.commandPrefixes.convertGuid(eventData.vars[3]),
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

                var suicide = (eventData.vars[4] == eventData.vars[8]) || eventData.vars[8] == '-1'
                
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