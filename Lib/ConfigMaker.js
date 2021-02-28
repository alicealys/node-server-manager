const readline = require("readline")

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const fs = require('fs')
const path = require('path')

class ConfigMaker {
    init() {
        return new Promise((resolve, reject) => {

            if (!fs.existsSync(path.join(__dirname, `../Configuration`))) {
                fs.mkdirSync(path.join(__dirname, `../Configuration`))
            }

            var Gamenames = ['Default', 'IW3', 'IW4', 'IW5', 'T6']

            var configTemplate = [
                {Question: 'Enable Webfront [true / false]', value: true},
                {Question: 'Webfront bind port: [0-65536]', value: 8000},
                {Question: 'Enable Webfront https', value: false},
                {Question: 'SSL Key file', value: '', depends: 2},
                {Question: 'SSL Certificate file', value: '', depends: 2},
                {Question: 'Webfront Hostname', value: ''},
                {Question: 'Discord WebHook url', value: ''},
                {Question: 'MOTD', value: 'No message of the day today :('},
                {Question: 'Command Prefix', value: '.'},
                {Question: 'Server IP', value: 'localhost'},
                {Question: 'Server Port', value: 27016},
                {Question: 'Server Rcon Password', value: ''},
                {Question: 'Server Log file path', value: '/pluto/storage/iw5/games_mp.log'},
                {Question: 'Server Gamename (0: Default, 1: IW3, 2: IW4, 3: IW5, 4: T6', value: '0'},
                {Question: 'Reserved slots:', value: 0},
            ]
            
            function askQuestion(Index) {
                if (configTemplate[Index].depends && configTemplate[configTemplate[Index].depends].value != 'true') {
                    askQuestion(++Index)
                    return
                }
                rl.question(`${configTemplate[Index].Question} (default: ${configTemplate[Index].value}): `, (value) => {
                    value.length > 0 && (configTemplate[Index].value = value)
                    if (Index < configTemplate.length - 1) askQuestion(++Index)
                    else {
                        rl.close()
                        return
                    }
            
                })
            }
            askQuestion(0)
            
            rl.on("close", function() {
                var configuration = JSON.stringify({
                    'Webfront': configTemplate[0].value == 'true',
                    'WebfrontPort': parseInt(configTemplate[1].value),
                    'WebfrontSSL': configTemplate[2].value == 'true',
                    'WebfrontSSL-Key': configTemplate[3].value,
                    'WebfrontSSL-Cert': configTemplate[4].value,
                    'webfrontHostname': configTemplate[5].value,
                    'discordHookUrl': configTemplate[6].value,
                    'MOTD':  configTemplate[7].value,
                    'Info': 'No info for now...',
                    'commandPrefixes': [ configTemplate[8].value ],
                    'broadcastCommandPrefixes': ['@'],
                    'links': [],
                    'socialMedia': [],
                    'rules': [],
                    'locale': 'en',
                    "autoMessagesInterval": 60,
                    "autoMessages": [
                        "A total of ^5{TOTALCLIENTS}^7 players have played on this server",
                        "Join the discord at ^5discord.gg/^7!",
                        "This server uses ^1Node Server Manager^7 get it at ^5github.com/fedddddd/node-server-manager^7",
                        "There are ^5{PLAYERCOUNT}^7 online players across ^5{SERVERCOUNT}^7 servers at the moment",
                        "^5{TOTALKILLS}^7 players have been killed on this server",
                        "^5{TOTALPLAYEDTIME}^7 hours have been wasted playing on this server"
                    ],
                    'Servers':[
                        {
                            'IP' : configTemplate[9].value,
                            'PORT' : configTemplate[10].value,
                            'PASSWORD' : configTemplate[11].value,
                            'LOGFILE' : configTemplate[12].value,
                            'Gamename' : Gamenames[parseInt(configTemplate[13].value)],
                            'reservedSlots' : parseInt(configTemplate[14].value),
                        }
            
                    ],
                    "Permissions" : {
                        "Levels" : {
                            "ROLE_BANNED" : -1,
                            "ROLE_USER" : 0,
                            "ROLE_FLAGGED" : 1,
                            "ROLE_TRUSTED" : 2,
                            "ROLE_MODERATOR" : 3,
                            "ROLE_ADMIN" : 4,
                            "ROLE_OWNER" : 5,
                            "ROLE_MANAGER": 6
                        },
                        "Commands" : {
                            "COMMAND_KICK" : "ROLE_MODERATOR",
                            "COMMAND_USER_CMDS" : "ROLE_USER",
                            "COMMANDS_KICK" : "ROLE_MODERATOR",
                            "COMMAND_FIND" : "ROLE_MODERATOR",
                            "COMMAND_SETROLE" : "ROLE_ADMIN",
                            "COMMAND_TP" : "ROLE_ADMIN",
                            "COMMAND_RCON" : "ROLE_OWNER",
                            "COMMAND_TOKEN" : "ROLE_MODERATOR",
                            "COMMAND_BAN" : "ROLE_MODERATOR",
                            "COMMAND_CHANGE_INFO" : "ROLE_ADMIN",
                            "COMMAND_MAP": "ROLE_ADMIN"
                        },
                        "Roles" : {
                            "ROLE_BANNED" : "Banned",
                            "ROLE_USER" : "User",
                            "ROLE_FLAGGED" : "Flagged",
                            "ROLE_TRUSTED" : "Trusted",
                            "ROLE_MODERATOR" : "Moderator",
                            "ROLE_ADMIN" : "Admin",
                            "ROLE_OWNER" : "Owner",
                            "ROLE_MANAGER": "Node Server Manager"
                        }
                    }
                }, null, 4)

                fs.writeFile(path.join(__dirname, `../Configuration/NSMConfiguration.json`), configuration, (err) => {
                    console.log('Config done! Rerun the executable to start')
                    resolve(configuration)
                })
            })
        })
    }
}

module.exports = ConfigMaker
