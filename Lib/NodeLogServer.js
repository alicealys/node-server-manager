const path          = require('path')
const configuration = require(path.join(__dirname, `../Configuration/NLSConfiguration.json`).toString())
const ws            = require('ws')
const fs            = require('fs')
const https         = require('https')
const http          = require('http')
const spawn         = require('child_process').spawn
const Tail          = require('tail').Tail

class NodeLogServer {
    constructor(config) {
        this.logFile = config.logFile
        this.bindPort = config.bindPort
        try {
            this.ssl = {
                key: fs.readFileSync(config.ssl.key),
                cert: fs.readFileSync(config.ssl.cert)
            }
        } catch (e) {
            this.ssl = null
            console.warn('Unable to load SSL certificate from configuration, starting server without SSL is not recommended, provide a valid certificate if possible') 
        }

        this.key = config.key

        this.init()
    }
    init() {
        try {
            const server = this.ssl ? https.createServer(this.ssl) : http.createServer()
            const socket = new ws.Server({ server })

            server.listen(this.bindPort, () => {
                console.log(`Server listening on port ${this.bindPort}`)
            })

            var getParams = (url) => {
                var queryDict = {}
                url.substr(1).split("&").forEach(function(item) {queryDict[item.split("=")[0]] = item.split("=")[1]})
                return queryDict;
            }

            var filePath = path.resolve(this.logfile)

            if (!fs.existsSync(filePath)) {
                console.log(`Warning: log file "${filePath}" doesn't exist\nMake sure you selected the right file in Configuration/NLSConfiguration.json Servers -> LOGFILE\n`)
            }
    
            if (process.platform == 'win32') {
                var tail = spawn(`powershell`, ['-command', 'get-content', '-wait', '-Tail 0', `"${filePath}"`])
                tail.stdout.on('data', (data) => {
                    this.onLine(data.toString())
                })
                return
            }
            
            var tail = new Tail(filePath)
            tail.watch()
    
            tail.on('line', this.onLine.bind(this))

            socket.Broadcast = (msg) => {
                socket.authorizedClients.forEach(client => {
                    client.send(msg)
                })
            }

            socket.authorizedClients = []
            socket.on('connection', (conn, req) => {
                var params = getParams(req.url.substr(1))

                if (params.key != this.key) {
                    console.log(`Rejecting connection from ${req.socket.remoteAddress}`)
                    conn.close()
                    return
                }
                console.log(`Accepting connection from ${req.socket.remoteAddress}`)
                socket.authorizedClients.push(conn)
            })
        }
        catch (e) {
            console.log(`Log server failed to start: ${e.toString()}`)
        }
    }
    onLine(data) {
        socket.Broadcast(data)
    }
}

configuration.Servers.forEach(config => {
    new NodeLogServer(config)
})