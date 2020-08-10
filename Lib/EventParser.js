class EventParser {
    constructor(Server) {
        this.Server = Server
    }
    getEventData(eventString) {
        eventString = eventString.replace(/[0-9]+:[0-9]+\s/g, '').trim();
        var eventRegex = {
          /* https://github.com/RaidMax/IW4M-Admin/blob/2.4-pr/Application/EventParsers/BaseEventParser.cs :) */
          say: /^(say|sayteam);(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0);([0-9]+);([^;]*);(.*)$/g,
          join: /^(J);(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0);([0-9]+);(.*)$/g,
          quit: /^(Q);(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0);([0-9]+);(.*)$/g,
          damage: /^(D);(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0);(-?[0-9]+);(axis|allies|world|none)?;([^;]{1,24});(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0)?;(-?[0-9]+);(axis|allies|world|none)?;([^;]{1,24})?;((?:[0-9]+|[a-z]+|_|\+)+);([0-9]+);((?:[A-Z]|_)+);((?:[a-z]|_)+)$/g,
          kill: /^(K);(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0);(-?[0-9]+);(axis|allies|world|none)?;([^;]{1,24});(-?[A-Fa-f0-9_]{1,32}|bot[0-9]+|0)?;(-?[0-9]+);(axis|allies|world|none)?;([^;]{1,24})?;((?:[0-9]+|[a-z]+|_|\+)+);([0-9]+);((?:[A-Z]|_)+);((?:[a-z]|_)+)$/g,
          init: /^InitGame$/g
        }
        var eventData = {type: null, data: null}
        Object.entries(eventRegex).forEach((r) => {
          if (eventString.match(r[1])) {
            var eventVars = eventString.split(';')
            eventData = {type: r[0], vars: eventVars.slice(1)}
          }
        })
        return eventData;

    }
    parseEvent(eventString) {
        var eventData = this.getEventData(eventString);
        if (eventData.type == null) return;
        var parsedEvent = {type: eventData.type, data: null};
        switch (eventData.type) {
            case 'say':
                parsedEvent.data = {
                    Origin: this.Server.Clients[eventData.vars[1]],
                    Message: eventData.vars[3]
                }
            break;
            case 'quit':
            case 'join':
                parsedEvent.data = {
                    Origin: {
                        Guid: eventData.vars[0],
                        Clientslot: eventData.vars[1],
                        Name: eventData.vars[2]
                    },
                }
            break;
            case 'kill':
            case 'damage':
                var Weapon = eventData.vars[8]
                var BaseWeapon = Weapon
                if (Weapon.indexOf('_mp_') > 0) {
                    BaseWeapon = Weapon.substr(0, Weapon.indexOf('_mp'))
                }
                var suicide = eventData.vars[1] == eventData.vars[5]
                parsedEvent.data = {
                    Target: this.Server.Clients[eventData.vars[1]],
                    Origin: suicide ? {ClientId: 1} : this.Server.Clients[eventData.vars[5]],
                    Attack: {
                        Weapon: eventData.vars[8],
                        Damage: eventData.vars[9],
                        MOD: eventData.vars[10],
                        HitLoc: eventData.vars[11],
                        BaseWeapon: BaseWeapon
                    }
                } 
            break;
        }
        return parsedEvent;
    }
}
module.exports = EventParser