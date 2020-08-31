var servers
window.addEventListener('load', async () => {
    var wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws'
    var socket = new WebSocket(`${wsProtocol}://${window.location.host}`)
    socket.onopen = () => {
        setInterval(() => {
            socket.send(JSON.stringify({action: 'heartbeat'}))
        }, 1000)
    }
    document.getElementById('client-search').addEventListener('keydown', (e) => {
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
    document.getElementById('client-search').addEventListener('input', (e) => {
        (e.target.textContent.length > 0) && e.target.parentNode.classList.add('wf-shadow-default')
    })
    var params = getParams();
    params.q && ( document.getElementById('client-search').innerHTML = params.q )

    document.querySelectorAll('*[colorcode]').forEach(c => {
        c.innerHTML = parseCODColorCodes(c.innerHTML, c.getAttribute('colorcode-white')).outerHTML
    })

    document.body.appendChild(createElementFromHTML(`
        <div id='wf-overlay' class='wf-overlay'></div>
    `))

    document.getElementById('login-btn') && document.getElementById('login-btn').addEventListener('click', () => {
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

var messageBox = (text, params, deny, accept, callback) => {
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
    window.addEventListener('click', windowEnter)
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
        Window.querySelector('.wf-rcon-log').innerHTML = null
    })
    console.log(Window.style.height)
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
    Window.querySelector('.wf-rcon-textbox').addEventListener('keydown', async (e) => {
        if (e.keyCode == 13) {
            e.preventDefault()
            var command = e.target.textContent
            var args = command.toLocaleLowerCase().split(/\s+/g)
            switch (true) {
                case (args[0] == 'clear'):
                    clearConsole();
                    e.target.innerHTML = null
                return
            }

            Window.writeLine(`^2${Client.Name}@node^7:^5~^7$ ${command}`)
            e.target.innerHTML = null
            var result = JSON.parse(await makeRequest('GET', `/api/mod?command=${btoa(command)}&ServerId=${serversSelect.value}`, null))
            if (!result.success) return
            result.result.forEach(line => {
                Window.writeLine(line)
            })
        }
    })
    Window.addEventListener('click', (e) => {
        if (findParentBySelector(e.target, 'data-nodrag')) return
        Window.querySelector('.wf-rcon-textbox').focus()
    })
    Window.querySelector('.wf-rcon-header').prepend(serversSelect)
    Window.writeLine = (line) => {
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
    document.querySelectorAll('*[data-textbox]').forEach(div => {
        div.addEventListener('keydown', (e) => {
            if (e.keyCode === 13) {
                e.preventDefault()
                document.execCommand('insertHTML', false, '\n');
            }
        })
    })
})

async function replacePlaceholders(text) {
    var statistics = JSON.parse(await makeRequest('GET', '/api/statistics', null))
    text = text.replace('{PLAYERCOUNT}', statistics.playerCount)
               .replace('{SERVERCOUNT}', statistics.serverCount)
               .replace('{TOPSERVER-IP}', statistics.topServer.IP)
               .replace('{TOPSERVER-PORT}', statistics.topServer.PORT)
               .replace('{TOPSERVER-HOSTNAME}', statistics.topServer.Hostname)
               .replace('{TOPSERVER-PLAYERS}', statistics.topServer.playerCount)
    return text
}