window.addEventListener('load', () => {
    var wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws'
    var socket = new WebSocket(`${wsProtocol}://${window.location.host}/?action=socket_listen_servers`)

    socket.addEventListener('connect', (e) => {
        console.log('%c[ NSMSocket ]%c Connected', 'color:cyan, color: white')
    })

    socket.onopen = (e) => {
        setInterval(() => {
            socket.send('heartbeat')
        }, 1000)
    }

    socket.onmessage = (e) => {
        var msg = JSON.parse(e.data)
        console.log(msg)
        logMessage(msg, true)
    }
    renderServerList()
})

function logMessage(msg, refresh) {
    if (!msg.data) return
    var feed = document.querySelector(`*[data-serverid='${msg.data.ServerId}']`).querySelector('.wf-more-feed')
    switch (msg.event) {
        case 'event_client_message':
            feed.appendChild(parseHTML(
            `
            <div class='wf-message'>
                <div class='wf-message-sender'>
                    <a class='wf-link wf-message-sender' href='/id/${msg.data.Client.ClientId}'>${msg.data.Client.Name}</a>:</div>
                <div class='wf-message-message'>${COD2HTML(msg.data.Message, 'var(--color-text)')}</div>
            </div>
            `))
        break;
        case 'event_client_connect':
            refresh && refreshClientList(msg.data.ServerId)
            feed.appendChild(parseHTML(
                `
                    <div class='wf-message'>
                        <div class='wf-message-connect'>
                            <i class='fas fa-plus'></i> <a class='wf-link wf-message-sender' href='/id/${msg.data.Client.ClientId}'>${msg.data.Client.Name}</a>
                        </div>
                    </div>
                `
            ))
        case 'event_server_reload':
            refresh && refreshClientList(msg.data.ServerId)
        break;
        case 'event_client_disconnect':
            refresh && refreshClientList(msg.data.ServerId)
            feed.appendChild(parseHTML(
                `
                    <div class='wf-message'>
                        <div class='wf-message-quit'>
                            <i class='fas fa-minus'></i> <a class='wf-link wf-message-sender' href='/id/${msg.data.Client.ClientId}'>${msg.data.Client.Name}</a>
                        </div>
                    </div>
                `
            ))
        break;
    }
    feed.scrollTop = feed.scrollHeight
}

async function refreshClientList(serverId) {
    var clientCount = document.querySelector(`*[data-serverid='${serverId}']`).querySelector('*[data-playercount]')
    var uptime = document.querySelector(`*[data-serverid='${serverId}']`).querySelector('*[data-uptime]')
    var clientList = document.querySelector(`*[data-serverid='${serverId}']`).querySelector('.wf-more-player-list')
    var Status = JSON.parse(await makeRequest('GET', `/api/players?ServerId=${serverId}`, null))
    uptime.innerHTML = `<i class="fas fa-history"></i> ${time2str(Status.Uptime)}`
    clientList.querySelectorAll('*[data-clientslot]').forEach(c => c.style.display = 'none')
    clientCount.innerHTML = `<i class="fas fa-users"></i> ${Status.Clients.length} / ${Status.Dvars.MaxClients}`
    Status.Clients.forEach(Client => {
        var slot = clientList.querySelector(`*[data-clientslot='${Client.Clientslot}']`)
        slot.style.display = ''
        slot.children[0].innerHTML = Client.Name
        slot.href = `/id/${Client.ClientId}`
    })

}

function makeRequest (method, url, data) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest()
      xhr.open(method, url, true)
      xhr.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          resolve(xhr.response)
        } else {
          reject({
            status: this.status,
            statusText: xhr.statusText
          });
        }
      };
      xhr.onerror = function () {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      };
      xhr.send(data)
    });
}

function parseHTML(html) {
    var t = document.createElement('template');
    t.innerHTML = html;
    return t.content.cloneNode(true);
}

function time2str(secs) {
    unit = 's'
    switch (true) {
        case (secs < 3600):
            secs /= 60
            unit = 'min'
        break
        case (secs >= 3600 && secs < 86400):
            secs /= 3600
            unit = 'h'
        break
        case (secs >= 86400):
            secs /= 86400
            unit = 'd'
        break
    }
    return `${secs.toFixed(1)}${unit}`
}

async function renderServerList() {
    var servers = JSON.parse(await makeRequest('GET', '/api/servers', null))
    servers.forEach(async server => {
        var status = server
        var serverCard = parseHTML(`
            <div data-serverid='${server.ServerId}' class='wf-serverlist-server'>
                <div class='wf-serverlist-server-info'>
                    <div class='wf-serverlist-hostname'>${COD2HTML(status.Dvars.Hostname, 'var(--color-text)')}</div>
                    <div class='wf-serverlist-players hide-mobile'>${status.Dvars.Map}</div>
                    <div class='wf-serverlist-uptime hide-mobile' data-uptime><i class="fas fa-history"></i> ${time2str(status.Uptime)}</div>
                    <div class='wf-serverlist-players hide-mobile' data-playercount><i class="fas fa-users"></i> ${status.Clients.length} / ${status.Dvars.MaxClients} </div>
                    <div class='wf-serverlist-button hide-mobile' ><i class='fas fa-sort-up an' onclick='prependServer(${server.ServerId})'></i></div>
                    <div class='wf-serverlist-button' ><i class='fas fa-arrow-right an' style='transform:rotate(90deg)' data-more-button  data-shown='true'></i></div>
                </div>

                <div class='wf-serverlist-server-more'>
                    <div class='wf-serverlist-server-more-top-mobile'>
                        <div class='server-info-column'>
                            <div class='server-info-dvar'>
                                <div class='wf-default server-info-dvar-name'>Uptime</div>
                                <div class='wf-default server-info-dvar-name'>${time2str(status.Uptime)}</div>
                            </div>
                            <div class='server-info-dvar'>
                                <div class='wf-default server-info-dvar-name'>Map</div>
                                <div class='wf-default server-info-dvar-name'>${status.Dvars.Map}</div>
                            </div>
                            <div class='server-info-dvar'>
                                <div class='wf-default server-info-dvar-name'>Players</div>
                                <div class='wf-default server-info-dvar-name'>${status.Clients.length} / ${status.Dvars.MaxClients}</div>
                            </div>
                        </div>
                    </div>
                    <div class='wf-serverlist-server-more-top'>
                        <div class='wf-more-player-list nice-scrollbar'></div>
                        <div class='wf-more-feed nice-scrollbar'></div>
                    </div>
                    <div class='wf-clienthistory' id='${server.ServerId}_chart'></div>
                </div>
            </div>`)

        serverCard.querySelector('*[data-more-button]').addEventListener('click', (e) => {
            var shown = (e.target.getAttribute('data-shown')) == 'true'
            e.target.setAttribute('data-shown', (!shown).toString())
            e.target.getAttribute('data-shown') == 'true' ? e.target.style.transform = 'rotate(90deg)' : e.target.style.transform = ''
            e.target.parentNode.parentNode.parentNode.querySelector('.wf-serverlist-server-more').style.display = e.target.getAttribute('data-shown') == 'true' ? '' : 'none'
        })

        document.getElementById('wf-serverlist-mount').appendChild(serverCard)

        serverCard = document.querySelector(`*[data-serverid='${server.ServerId}']`)

        for (var i = 0; i < status.Dvars.MaxClients; i++) {
            serverCard.querySelector('.wf-more-player-list').appendChild(parseHTML(`<a data-clientslot='${i}' class='wf-client-wrap' style='display:none'><div class='wf-client-name'></div></a>`))
        }

        status.Clients.forEach(Client => {
            console.log(Client.ClientSlot)
            serverCard.querySelector(`*[data-clientslot='${Client.Clientslot}'`).href = `/id/${Client.ClientId}`
            serverCard.querySelector(`*[data-clientslot='${Client.Clientslot}'`).children[0].innerHTML = Client.Name
            serverCard.querySelector(`*[data-clientslot='${Client.Clientslot}'`).style.display = ''
        })

        status.clientActivity.forEach(msg => {logMessage(msg, false)})

        server.clientHistory.map(x => x.x = new Date(x.x))

        server.Online ? renderChart(`${server.ServerId}_chart`, server.clientHistory, true, server.Dvars.MaxClients, "#CBC5BB") : renderChart(`${server.ServerId}_chart`, server.clientHistory, true, server.Dvars.MaxClients, "#FF3131")

        document.querySelectorAll('.wf-serverlist-server-more').forEach(s => s.style.display = 'block')
    })
}

function prependServer(ServerId) {
    document.querySelector(`*[data-serverid='${ServerId}']`).parentNode.prepend(document.querySelector(`*[data-serverid='${ServerId}']`))
}

function renderChart(id, playerHistory, animation, MaxClients, color) {
    var chart = new CanvasJS.Chart(id, {
        theme: "dark1", // "light1", "light2", "dark1", "dark2"
        defaultFontFamily: "codef",
        animationEnabled: animation,
        backgroundColor: "transparent",
        zoomEnabled: false,
        height:100,
        fontFamily: "codef",
        xValueType: "dateTime",
        toolTip: {
            cornerRadius: 5,
            fontFamily: "codef",
            contentFormatter: function (e) {
                const date = moment.utc(e.entries[0].dataPoint.x).calendar();
                return `${date} - ${e.entries[0].dataPoint.y} players`;
            }
        },
        axisX: {
            interval: 1,
            gridThickness: 0,
            lineThickness: 1,
            tickThickness: 0,
            margin: 0,
            valueFormatString: " "
        },
           axisY: {
            gridThickness: 0,
            lineThickness: 0,
            tickThickness: 0,
            minimum: 0,
            maximum: MaxClients,
            margin: 0,
            valueFormatString: " ",
            labelMaxWidth: 0
        },
        fontColor: color,
        data: [{
            showInLegend: false,
            type: "splineArea",
            color: color,
            markerSize: 0,
            dataPoints: playerHistory
        }]
    });
    chart.render()
    document.getElementById(id).offsetWidth;
} 

function parseCODColorCodes(text) {
    text = '^7' + text;
    var regexp = /[\^][0-9]/g;
    var regexpRainbow = /[\^][:]/g;
    var letters = [];
    var colorCodes = {
        '^1' : '#FF3131',
        '^2' : '#86C000',
        '^3' : '#FFAD22',
        '^4' : '#0082BA',
        '^5' : '#25BDF1',
        '^6' : '#9750DD',
        '^7' : '#FFFFFF',
        '^8' : '#000000',
        '^9' : '#99A3B0',
        '^0' : '#000000',
        '^:' : 'rainbow'
    }
    var nextColor = '#FFFFFF'
    for (var i = 0; i < text.length; i++) {
        if (i < text.length && ((text[i] + text[i + 1]).match(regexp) != null || (text[i] + text[i + 1]).match(regexpRainbow) != null)) {
            nextColor = colorCodes[text[i] + text[i + 1]];
        } else if (i > 1 && (text[i - 1] + text[i]).match(regexp) == null && (text[i - 1] + text[i]).match(regexpRainbow) == null) {
            var color = nextColor == 'rainbow' ? 'data-rainbow-text' : `style='color:${nextColor}'`;
            var letter = createElementFromHTML(`<span ${color}></span>`)
            letter.textContent = text[i];
            letters.push(letter);
        }
    }
    var text = createElementFromHTML(`<span></span>`);
    for (var i = 0; i < letters.length; i++) {
        text.appendChild(letters[i]);
    }
    return text;
}
var rainbowColorIndex = 0;
setInterval(() => {
    rainbowColorIndex > 360 ? rainbowColorIndex = 0 : ++rainbowColorIndex;
    document.querySelectorAll("*[data-rainbow-text]").forEach((r) => {
        var nextColor = hslToHex(rainbowColorIndex, 100, 50);
        r.style.color = nextColor;
    })
}, 100)
function hslToHex(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    const toHex = x => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function createElementFromHTML(htmlString) {
    var div = document.createElement('div');
    div.innerHTML = htmlString.trim();
    return div.firstChild; 
}