var servers

class EventEmitter {
    constructor() {
        this.callbacks = []
    }
    on(event, callback) {
        this.callbacks.push({event, callback})
    }
    emit(event) {
        let args = [].slice.call(arguments)
        this.callbacks.forEach(callback => {
            if (event == callback.event) {
                callback.callback.apply(null, args.slice(1))
            }
        })
    }
}

var webfront = new EventEmitter()

window.addEventListener('load', async () => {
    var wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws'
    var socket = new WebSocket(`${wsProtocol}://${window.location.host}/?action=socket_listen_servers`)

    socket.onmessage = (msg) => {   
        var msg = JSON.parse(msg.data)
        webfront.emit(msg.event, msg.data)
    }

    socket.onopen = () => {
        webfront.emit('connected')
        setInterval(() => {
            socket.send(JSON.stringify({action: 'heartbeat'}))
        }, 1000)
    }

    document.getElementById('client-search').addEventListener('keydown', async (e) => {
        if (e.keyCode == 13) {
            e.preventDefault()
            if (e.target.textContent.length > 0) {
                e.target.parentNode.classList.add('wf-shadow-default')
                window.location.href = `${window.location.origin}/search?q=${e.target.textContent}`
            } else {
                e.target.parentNode.classList.remove('wf-shadow-default')
                e.target.parentNode.classList.add('wf-shadow-error')
            }
        }
    })

    servers = JSON.parse(await makeRequest('GET', '/api/servers', null))
    document.getElementById('client-search').addEventListener('input', async (e) => {
        (e.target.textContent.length > 0) && e.target.parentNode.classList.add('wf-shadow-default')
    })

    var params = getParams()
    params.q && ( document.getElementById('client-search').innerHTML = params.q )

    document.querySelectorAll('*[colorcode]').forEach(c => {
        c.innerHTML = COD2HTML(c.innerHTML, c.getAttribute('colorcode-white'))
    })
    document.querySelectorAll('*[date-moment]').forEach(d => { d.innerHTML = moment(d.innerHTML).calendar() })

    document.body.appendChild(createElementFromHTML(`
        <div id='wf-overlay' class='wf-overlay'></div>
    `))

    document.getElementById('login-btn') && document.getElementById('login-btn').addEventListener('click', async () => {
        messageBox(
            'Hello!\nYou can find your credentials by typing .token in game!', 
        [
            {type: 'text', name: 'ClientId', placeholder: 'ClientId'},
            {type: 'password', name: 'Token', placeholder: 'Token / Password'},
            {type: 'password', name: 'twofactor', placeholder: '2FA (Optional)'}
        ], 'Cancel', 'Login', async (params, messageBox) => {
            messageBox.querySelector('*[data-text-label]').innerHTML = 'Logging in... <i class="fas fa-slash fa-spin"></i>'
            var loginStatus = JSON.parse(await makeFormRequest('POST', '/auth/login', `ClientId=${params.ClientId}&Token=${params.Token}&twofactor=${params.twofactor}`))
            loginStatus.success ? window.location.href = window.location.href : messageBox.querySelector('*[data-text-label]').innerHTML = loginStatus.error
        })
    })
    document.getElementById('profile-menu-btn') && document.getElementById('profile-menu').querySelectorAll('div').forEach(entry => {
        entry.addEventListener('click', async (e) => {
            switch (e.target.getAttribute('data-menu-command')) {
                case 'logout':
                    await makeFormRequest('POST', '/auth/logout', null)
                    window.location.href = window.location.href
                break;
                case 'password':
                    messageBox('', [{
                        type: 'password',
                        name: 'previous',
                        placeholder: `Token / Previous password`
                    },
                    {
                        type: 'password',
                        name: 'password',
                        placeholder: 'Password'
                    },
                    {
                        type: 'password',
                        name: 'confirm',
                        placeholder: 'Confirm password'
                    },
                    ], 'Cancel', 'Confirm', async (params, messageBox) => {
                        messageBox.querySelector('*[data-text-label]').innerHTML = ''
                        switch (true) {
                            case (!params.password || !params.confirm || !params.previous):
                                messageBox.querySelector('*[data-text-label]').innerHTML = 'Please insert all fields'
                                return
                            case (params.password != params.confirm):
                                messageBox.querySelector('*[data-text-label]').innerHTML = 'Passwords don\'t match'
                                return
                            case (params.password.length < 8):
                                messageBox.setText('Password is too short')
                                return
                            case (params.password.length > 64):
                                messageBox.querySelector('*[data-text-label]').innerHTML = 'Password is too long'
                                return
                        }
                        var result = JSON.parse(await makeFormRequest('POST', '/auth/changepassword', `previous=${params.previous}&password=${params.password}`))
                        result.success ? window.location.href = window.location.href : messageBox.querySelector('*[data-text-label]').innerHTML = result.error
                    })
                    break;
            }
        })
    })
    document.getElementById('profile-menu-btn') && window.addEventListener('click', (e) => {
        var button = document.getElementById('profile-menu-btn')
        var menu = document.getElementById('profile-menu')
        switch (true) {
            case (e.target.id == 'profile-menu-btn' && ( menu.style.display == 'none' || !menu.style.display ) ):
                menu.style.display = 'block'
                var rect = button.getBoundingClientRect()
                menu.style.left = rect.left
                menu.style.top = rect.top + button.offsetHeight - 10
                break
            case (!findParentBySelector(e.target, 'data-profile-menu') && menu.style.display == 'block'):
                menu.style.display = 'none'
                break
        }
    })
})

function findParentBySelector(elm, selector) {
    try {
        while (elm.getAttribute(selector) == null) {
            if (elm.parentNode.tagName.toLocaleLowerCase() == "body") {
                return false;
            }
            elm = elm.parentNode;
        }
        return true;
    }
    catch (e) { return false; }
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

function makeFormRequest (method, url, data) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest()
      xhr.open(method, url, true)
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
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

function createElementFromHTML(htmlString) {
    var div = document.createElement('div');
    div.innerHTML = htmlString.trim();
    return div.firstChild; 
  }

var messageBox = async (text, params, deny, accept, callback) => {
    document.querySelector('.wf-overlay').style.display = 'flex'
    var messageBox = createElementFromHTML(`
        <div class='an file-preview' style='display:block'>
            <div class='file-preview-content messagebox-text-wrap' data-form-cont>
                <span class='file-preview-message messagebox-text' data-text-label>${text}</span>
            </div>
            <div data-buttons class='file-preview-button-cont'>
                <span data-cancel-button class='file-preview-button file-preview-button-cancel'>${deny}</span>
                <span data-upload-button class='file-preview-button file-preview-button-upload'>${accept}</span>
            </div>
        </div>
    `)
    var i = 0; params.forEach(param => {
        var form = createElementFromHTML(`<input class='wf-form' type='${param.type}' data-param='${param.name}'>`)
        form.setAttribute('placeholder', param.placeholder)
        messageBox.querySelector('*[data-form-cont]').appendChild(form)
    })
    document.querySelector('.wf-overlay').appendChild(messageBox)
    var closeMessagebox = () => {
        messageBox.classList.remove("zoom");
        messageBox.style.animation = "";
        messageBox.offsetHeight;
        messageBox.style.animation = null;
        messageBox.classList.add("imagezoomout");
        setTimeout(() => {
            document.querySelector('.wf-overlay').style.display = "none";
            messageBox.remove();
        }, 50);
        window.removeEventListener('keydown', windowEnter)
    }
    messageBox.setText = (text) => {
        messageBox.querySelector('*[data-text-label]').innerHTML = text
    }

    var acceptMessagebox = () => {
        var params = {}
        messageBox.querySelector('*[data-form-cont]').querySelectorAll('input').forEach(form => {
            params[form.getAttribute('data-param')] = form.value
        })
        callback(params, messageBox, closeMessagebox)
    }
    var windowEnter = (e) => {
        if (e.keyCode == 13) {
            acceptMessagebox()
        }
    }
    messageBox.querySelector('*[data-cancel-button]').addEventListener('click', closeMessagebox)
    messageBox.querySelector('*[data-upload-button]').addEventListener('click', acceptMessagebox)
    window.addEventListener('keydown', windowEnter)
}

function getParams() {
    var queryDict = {}
    location.search.substr(1).split("&").forEach(function(item) {queryDict[item.split("=")[0]] = item.split("=")[1]})
    return queryDict;
}

function parseCODColorCodes(text, white = '#FFFFFF') {
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
        '^7' : white,
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

function COD2HTML(text, white = '#FFFFFF') {
    text = `^7${text}`
    var colorCodes = {
        '^1' : `style='color: #FF3131'`,
        '^2' : `style='color: #86C000'`,
        '^3' : `style='color: #FFAD22'`,
        '^4' : `style='color: #0082BA'`,
        '^5' : `style='color: #25BDF1'`,
        '^6' : `style='color: #9750DD'`,
        '^7' : `style='color: ${white}'`,
        '^8' : `style='color: #000000'`,
        '^9' : `style='color: #99A3B0'`,
        '^0' : `style='color: #000000'`,
        '^:' : `data-rainbow-text`
    }
    var formattedText = text.replace(new RegExp(/\^([0-9]|\:|\;)/g, 'g'), (a) => {
        return `</span><span class='wf-colorcode' ${colorCodes[a]}>`
    })
    return formattedText.substr(7) + '</span>'
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

function escapeHtml(text) {
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }
    return text.replace(/[&<>"']/g, function(m) { return map[m] })
  }

let chat = false
async function newRCONWindow() {
    var serversSelect = createElementFromHTML(`<select class='wf-select' data-nodrag></select>`)
    servers.forEach(server => {
        serversSelect.appendChild(createElementFromHTML(`
            <option class='wf-option' data-nodrag value=${server.ServerId}>${parseCODColorCodes(server.Dvars.Hostname, 'var(--color-text)').outerHTML}</option>
        `))
    })
    var Window = createElementFromHTML(`
        <div class='wf-rcon-window' style='height:auto;width:auto;'>
            <div class='wf-rcon-header' data-drag-el>
                <div class='wf-header-buttons'>
                    <div class='wf-profile-header-button'><i data-clear-btn class="far fa-trash"></i></div>
                    <div class='wf-profile-header-button'><i data-maximized='false' data-maximize-btn class="far fa-expand"></i></div>
                    <div class='wf-profile-header-button' data-close-btn><i class="fas fa-times"></i></div>
                </div>
            </div>
            <div class='wf-rcon-log nice-scrollbar'  data-nodrag></div>
            <div class='wf-rcon-textbox-cont'>
                <div class='wf-rcon-textbox-wrap'>
                    <div class='wf-rcon-textbox' data-placeholder='Type a command' contenteditable='true'></div>
                </div>
            </div>
        </div>
    `)
    serversSelect.addEventListener('change', () => {
        clearConsole()
    })
    var clearConsole = () => {
        Window.querySelector('.wf-rcon-log').innerHTML = null
        Window.writeLine('Last login: ' + moment().format('ddd MMM DD hh:mm:ss yy'))
    }
    Window.querySelector('*[data-clear-btn]').addEventListener('click', clearConsole)
    Window.querySelector('*[data-maximize-btn]').addEventListener('click', (e) => {
        e.target.setAttribute('data-maximized', !(e.target.getAttribute('data-maximized') == 'true'))
        e.target.className = e.target.getAttribute('data-maximized') == 'true' ? 'far fa-compress' : 'far fa-expand'
        Window.style.left = Window.style.top = e.target.getAttribute('data-maximized') == 'true' ? '0px' : '50px'
        Window.style.height = Window.style.width = e.target.getAttribute('data-maximized') == 'true' ? '100%' : 'auto'
    })

    webfront.on('event_client_message', (event) => {
        chat && Window.writeLine(`^5${event.Client.Name}^7 @ ^6${event.Hostname}^7: ${event.Message}`)
    })

    Window.querySelector('.wf-rcon-textbox').addEventListener('keydown', async (e) => {
        if (e.keyCode == 13) {
            e.preventDefault()
            var command = e.target.textContent
            var args = command.toLocaleLowerCase().split(/\s+/g)
            e.target.innerHTML = null
            Window.writeLine(`^2${Client.Name}@node^7:^5~^7$ ${command}`)
            switch (args[0].toLocaleLowerCase()) {
                case 'clear':
                    clearConsole();
                    e.target.innerHTML = null
                return
                case 'exit':
                    Window.remove()
                return
                case 'chat':
                    chat ^= true
                    Window.writeLine(`Display chat ${chat ? '^2enabled' : '^1disabled'}`)
                return
            }
            if (command) {
                var result = JSON.parse(await makeRequest('GET', `/api/mod?command=${btoa(command)}&ServerId=${serversSelect.value}`, null))
                if (!result.success) return
                result.result.forEach(line => {
                    Window.writeLine(line)
                })
            }
        }
    })
    Window.addEventListener('click', (e) => {
        if (findParentBySelector(e.target, 'data-nodrag')) return
        Window.querySelector('.wf-rcon-textbox').focus()
    })
    Window.querySelector('.wf-rcon-header').prepend(serversSelect)
    Window.writeLine = (line) => {
        line = escapeHtml(line)
        Window.querySelector('.wf-rcon-log').appendChild(createElementFromHTML(`
            <div data-nodrag class='wf-rcon-line'>
                ${COD2HTML(line)}
            </div>
        `))
        Window.querySelector('.wf-rcon-log').scrollTop = Window.querySelector('.wf-rcon-log').scrollHeight
    }
    Window.writeLine('Last login: ' + moment().format('ddd MMM DD hh:mm:ss yy'))
    Window.querySelector('*[data-close-btn]').addEventListener('click', () => Window.remove())
    document.body.appendChild(Window)
    Window.querySelector('.wf-rcon-textbox').focus()
    dragElement(Window)
}

function getWidth() {
    return Math.max(
      document.body.scrollWidth,
      document.documentElement.scrollWidth,
      document.body.offsetWidth,
      document.documentElement.offsetWidth,
      document.documentElement.clientWidth
    );
  }
function getHeight() {
    return Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.documentElement.clientHeight
    );
  }

function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    elmnt.querySelector('*[data-drag-el]').onmousedown = dragMouseDown

    function dragMouseDown(e) {
        if (e.target.hasAttribute('data-nodrag')) return
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        if (e.target.hasAttribute('data-nodrag')) return
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        var leftOffset = elmnt.offsetLeft - pos1
        var topOffset = elmnt.offsetTop - pos2


        elmnt.style.top = Math.min(Math.max(topOffset, 0), getHeight() - (elmnt.offsetHeight )) + "px"
        elmnt.style.left = Math.min(Math.max(leftOffset, 0), getWidth() - elmnt.offsetWidth) + "px"
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

async function xbbParse(xbb) {
    xbb.style.display = 'none'
    var rawText = await replacePlaceholders(xbb.textContent.trim())
    var result = XBBCODE.process({
      text: rawText,
      removeMisalignedTags: true,
      addInLineBreaks: false
    })
    xbb.innerHTML = result.html
    xbb.style.display = ''
}

window.addEventListener('load', async () => {
    document.querySelectorAll(`*[data-xbbcode]`).forEach(async xbb => {
        xbb.style.display = 'none'
        var rawText = await replacePlaceholders(xbb.textContent.trim())
        var result = XBBCODE.process({
          text: rawText,
          removeMisalignedTags: true,
          addInLineBreaks: false
        })
        xbb.innerHTML = result.html
        xbb.style.display = ''
    })
    document.querySelectorAll(`*[data-profile-preview]`).forEach(async link => {
        profileHover(link, link.getAttribute('data-clientid'))
    })
    document.querySelectorAll('*[data-textbox]').forEach(div => {
        div.addEventListener('keydown', (e) => {
            if (e.keyCode === 13) {
                e.preventDefault()
                document.execCommand('insertHTML', false, '\n');
            }
        })
    })
    document.querySelectorAll('*[data-canvas]').forEach(canvas => {
        var data = JSON.parse(canvas.getAttribute('data-canvas'))
        data.map(d => d.x = new Date(d.x))
        renderPerformanceChart(canvas.id, data, true, '#D5D0C7')
    })
})

let placeHolderCache = {}
async function replacePlaceholders(text) {
    if (placeHolderCache[text]) return placeHolderCache[text]

    var statistics = JSON.parse(await makeRequest('GET', '/api/statistics', null))
    replaced = text.replace('{PLAYERCOUNT}', statistics.playerCount)
               .replace('{SERVERCOUNT}', statistics.serverCount)
               .replace('{TOPSERVER-IP}', statistics.topServer.IP)
               .replace('{TOPSERVER-PORT}', statistics.topServer.PORT)
               .replace('{TOPSERVER-HOSTNAME}', statistics.topServer.Hostname)
               .replace('{TOPSERVER-PLAYERS}', statistics.topServer.playerCount)

    placeHolderCache[text] = replaced
    return replaced
}

async function renderPerformanceChart(id, data, animation, color) {
    var chart = new CanvasJS.Chart(id, {
        theme: "dark1", // "light1", "light2", "dark1", "dark2"
        defaultFontFamily: "codef",
        animationEnabled: animation,
        backgroundColor: "transparent",
        zoomEnabled: false,
        height:150,
        title: {
            text: 'Performance History',
            fontFamily: "codef",
        },
        fontFamily: "codef",
        xValueType: "dateTime",
        toolTip: {
            cornerRadius: 5,
            fontFamily: "codef",
            contentFormatter: function (e) {
                const date = moment.utc(e.entries[0].dataPoint.x).calendar()
                return `${date} - ${e.entries[0].dataPoint.y.toFixed(1)}`
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
            dataPoints: data
        }]
    });
    chart.render()
    document.getElementById(id).offsetWidth;
}

function imagePreview(el, url) {
    var img = createElementFromHTML(`
        <div class='wf-img-preview' data-img-preview>
            <img src='${url}'>
        </div>
    `)
    img.style.top = el.offsetTop + img.offsetHeight 
    img.style.left = el.offsetLeft + el.offsetWidth + 10 + img.offsetWidth / 2
    document.body.appendChild(img)
    return img
}

let coords = { x: 0, y: 0 }
let permissions = null
let client = null

window.addEventListener('mousemove', async (e) => {
    coords.x = e.clientX
    coords.y = e.clientY
})

function cursorOnElement(el, offset) {
    var rect = el.getBoundingClientRect()
    var rectangle = {
        x1: rect.x - offset.x1,
        y1: rect.y - offset.y1,
        x2: rect.x + rect.width + offset.x2,
        y2: rect.y + rect.height + offset.y2
    }

    return (coords.x > rectangle.x1 && coords.x < rectangle.x2) && (coords.y > rectangle.y1 && coords.y < rectangle.y2)
}

function guidGenerator() {
    var S4 = function() {
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}

async function profileHover(el, ClientId = null) {
    var timeout = null
    var profile = null
    var offset = { x1: 20, y1: 0, x2: 0, y2: 0 }
    var onElement = false
    el.id = el.id.length > 1 ? el.id : guidGenerator()

    el.addEventListener('mouseover', async () => {
        document.querySelectorAll('*[data-profile]').forEach(profile => {
            if (!profile) return
            if (profile.id != el.id && !cursorOnElement(profile, offset) && !cursorOnElement(el, {x1: 20, y1: 20, x2: 20, y2: 20})) {
                profile.remove() 
            }
        })
        timeout = setTimeout(async () => {
            onElement = true
            profile = await profilePreview({ x: coords.x + offset.x1, y: coords.y }, ClientId ? ClientId : el.getAttribute('data-clientid'))
        }, 500)
    })

    el.addEventListener('mouseout', async () => {
        clearTimeout(timeout)
    })

    window.addEventListener('mousemove', async () => {
        if (!profile) return
        if (!cursorOnElement(profile, offset) && !cursorOnElement(el, {x1: 20, y1: 20, x2: 20, y2: 20})) {
            profile.remove()
            profile = null
        }
    })
}

function setElementCoords(el, coords) {
    el.style.top = coords.y
    el.style.left = coords.x
}

async function _kickClient(Client) {
    messageBox(`Kick ${Client.Name}`, 
    [
      {type: 'text', name: 'Reason', placeholder: 'Reason'}
    ], 'Cancel', 'Kick', async (params, messageBox, close) => {
      switch (true) {
        case (params.Reason.length <= 0):
          messageBox.querySelector('*[data-text-label]').innerHTML = 'Please provide a reason'
        return
      }
      var result = JSON.parse(await makeRequest('GET', `/api/mod?command=${btoa(`command=kick @${Client.ClientId} ${params.Reason}`)}`))
      notifyMe(null, Client, result.result.join(' '))
      close()
    })
}

async function _unBanClient(Client) {
    messageBox(`Unban ${Client.Name}`, 
    [
      {type: 'text', name: 'Reason', placeholder: 'Reason'}
    ], 'Cancel', 'Unban', async (params, messageBox, close) => {
      switch (true) {
        case (params.Reason.length <= 0):
          messageBox.querySelector('*[data-text-label]').innerHTML = 'Please provide a reason'
        return
      }
      var result = JSON.parse(await makeRequest('GET', `/api/mod?command=${btoa(`command=unban @${Client.ClientId} ${params.Reason}`)}`))
      notifyMe(null, Client, result.result.join(' '))
      close()
    })
}

async function _banClient(Client) {
    messageBox(`Ban ${Client.Name}`, 
    [
      {type: 'text', name: 'Reason', placeholder: 'Reason'}
    ], 'Cancel', 'Ban', async (params, messageBox, close) => {
      switch (true) {
        case (params.Reason.length <= 0):
          messageBox.querySelector('*[data-text-label]').innerHTML = 'Please provide a reason'
        return
      }
      var result = JSON.parse(await makeRequest('GET', `/api/mod?command=${btoa(`command=ban @${Client.ClientId} ${params.Reason}`)}`))
      notifyMe(null, Client, result.result.join(' '))
      close()
    })
}

function parseHTML(html) {
    var t = document.createElement('template');
    t.innerHTML = html;
    return t.content.cloneNode(true);
}

async function profilePreview(coords, ClientId) {
    document.querySelectorAll('*[data-profile]').forEach(profile => { profile.remove() })

    !document.getElementById("notifications-cont") && document.body.appendChild(parseHTML(`<div id="notifications-cont" class='notification-cont'></div>`))

    permissions = permissions ? permissions : JSON.parse(await makeRequest('GET', '/api/permissions'))
    client = client ? client : JSON.parse(await makeRequest('GET', '/api/whoami'))

    var info = await makeRequest('GET', `/api/info?id=${ClientId}`)

    if (!info) return
    info = JSON.parse(info)

    var profile = createElementFromHTML(`
    <div class='wf-profle-preview wf-profile-header-' data-profile='${ClientId}'>
        <div class='wf-profile-header-name'>
            <div class='profile-header-left'>
                ${info.Flag ? `<div class='wf-profile-header-online'></div><div class='flag-icon wf-profile-flag flag-icon-${info.Flag}'></div>` : ''}
                <span class='wf-text'>${info.Name}</span>
                <i class='fas fa-circle fa-xs wf-profile-status iw-${info.Status.Color}'></i>
                <div class='wf-profile-header-online'>${info.Status.String}</div>
            </div>
            <div class='profile-header-right'>
            ${permissions.Commands && client.PermissionLevel > info.PermissionLevel && client.PermissionLevel >= permissions.Levels[permissions.Commands.COMMAND_KICK] && info.inGame.Online 
                ? `<div title='Kick' data-kick-btn class='wf-profile-header-button'><i class="fas fa-times"></i></div>` 
                : ''}
            ${!info.Ban.Banned && permissions.Commands && client.PermissionLevel > info.PermissionLevel && client.PermissionLevel >= permissions.Levels[permissions.Commands.COMMAND_BAN]
                ? `<div title='Ban' data-ban-btn class='wf-profile-header-button'><i class="fas fa-lock-open"></i></div>` 
                : ''}
            ${info.Ban.Banned && permissions.Commands && client.PermissionLevel > info.PermissionLevel && client.PermissionLevel >= permissions.Levels[permissions.Commands.COMMAND_BAN]
                ? `<div title='Unban' data-unban-btn class='wf-profile-header-button'><i class="fas fa-lock"></i></div>` 
                : ''}
            </div>
        </div>
        <div class='wf-profile-role'>
            ${info.Ban.Banned ? `<div class='iw-red'>Banned - ${info.Ban.Reason}</div>` : `<div>${COD2HTML(info.Role)}</div>`}
        </div>
        <div class='wf-profile-description-wrap'>
            <div class='wf-profile-description-line'>
                <pre class='wf-profile-description-inline' data-description>
                    ${info.Description ? info.Description : 'No info'}
                </pre>
            </div>
        </div>
    </div>
    `)

    profile.querySelector('*[data-kick-btn]') && profile.querySelector('*[data-kick-btn]').addEventListener('click', async () => {
        _kickClient({ClientId: info.ClientId, Name: info.Name})
    })

    profile.querySelector('*[data-ban-btn]') && profile.querySelector('*[data-ban-btn]').addEventListener('click', async () => {
        _banClient({ClientId: info.ClientId, Name: info.Name})
    })

    profile.querySelector('*[data-unban-btn]') && profile.querySelector('*[data-unban-btn]').addEventListener('click', async () => {
        _unBanClient({ClientId: info.ClientId, Name: info.Name})
    })

    document.body.appendChild(profile)
    xbbParse(profile.querySelector('*[data-description]'))
    setElementCoords(profile, coords)
    return profile
}

async function notifyMe(ServerId, Client, Message) {
    const notifications = document.getElementById("notifications-cont")
    var n = document.createDocumentFragment()
    var status = ServerId ? JSON.parse(await makeRequest('GET', `/api/players?ServerId=${ServerId}`)) : null
    Message = escapeHtml(Message)
    var notif = createElementFromHTML(`
    <div class='notification-notif notifFadeIn notifFadeOut'>
        <div class='notification-icon'></div>
        <div class='notification-textcontent'>
            <div class='notification-user'><div><a href='/id/${Client.ClientId}' class='wf-link wf-bold'>${status ? Client.Name : ''}</a> ${status ? '@' : ''} <div class='wf-notif-hostname' data-colorcode>${status ? COD2HTML(status.Dvars.Hostname, 'var(--color-text)') : 'Penalties'}</div></div></div>
            <pre class='notification-text'>${COD2HTML(Message)}</pre>
        </div>
        <div notification-dismiss class='notification-btn'>
            <i class='fas fa-lg fa-times'></i>
        </div>
    </div>`);
    n.appendChild(notif);
    var elements = notif.children;
    var notifyText = elements[1].children;
    elements[0].addEventListener("click", function() {
        showProfile(user, elements[0])
    })
    var notifTimeout = setTimeout(() => {
      notif.classList.remove("notifFadeIn");
      notif.style.opacity = "1";
      notif.style.transform = "translateX(0px)";
      setTimeout(() => {
          notif.remove();
      }, 300)
  }, 3000)
  notif.addEventListener("mouseover", function() {
      clearTimeout(notifTimeout);
  })
  notif.addEventListener("mouseout", function() {
      notifTimeout = setTimeout(() => {
          notif.classList.remove("notifFadeIn");
          notif.style.opacity = "1";
          notif.style.transform = "translateX(0px)";
          setTimeout(() => {
              notif.remove();
          }, 300)
      }, 3000)
  })
    notif.querySelector("*[notification-dismiss]").addEventListener("click", function() {
        clearTimeout(notifTimeout);
        notif.classList.remove("notifFadeIn");
        notif.style.opacity = "1";
        notif.style.transform = "translateX(0px)";
        setTimeout(() => {
            notif.remove();
        }, 300)
    })
    notifications.appendChild(n);
  }