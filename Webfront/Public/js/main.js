window.addEventListener('load', () => {
    var socket = new WebSocket(`wss://${window.location.hostname}`)
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
            '', 
        [
            {type: 'text', name: 'ClientId', placeholder: 'ClientId'},
            {type: 'password', name: 'Token', placeholder: 'Token / Password'}
        ], 'Cancel', 'Login', async (params, messageBox) => {
            messageBox.querySelector('*[data-text-label]').innerHTML = ''
            var loginStatus = JSON.parse(await makeFormRequest('POST', '/auth/login', `ClientId=${params.ClientId}&Token=${params.Token}`))
            loginStatus.success ? window.location.href = window.location.href : messageBox.querySelector('*[data-text-label]').innerHTML = loginStatus.error
        })
    })
    document.getElementById('profile-menu-btn') && document.getElementById('profile-menu-btn').addEventListener('click', () => {

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
                        var result = await makeFormRequest('POST', '/auth/changepassword', `previous=${params.previous}&password=${params.password}`)
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
    var acceptMessagebox = () => {
        var params = {}
        messageBox.querySelector('*[data-form-cont]').querySelectorAll('input').forEach(form => {
            params[form.getAttribute('data-param')] = form.value
        })
        callback(params, messageBox)
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

function newRCONWindow() {
    var Window = createElementFromHTML(`
        <div class='wf-rcon-window'>
            <div class='wf-rcon-header' data-drag-el>
                <div>Remote Console</div>
                <div class='wf-profile-header-button' data-close-btn><i class="fas fa-times"></i></div>
            </div>
            <div class='wf-rcon-log'></div>
            <div class='wf-rcon-textbox-cont'>
                <div class='wf-rcon-textbox-wrap'>
                    <div class='wf-rcon-textbox' data-placeholder='Type a command' contenteditable='true'></div>
                </div>
            </div>
        </div>
    `)
    Window.querySelector('*[data-close-btn]').addEventListener('click', () => Window.remove())
    document.body.appendChild(Window)
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
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        var leftOffset = elmnt.offsetLeft - pos1
        var topOffset = elmnt.offsetTop - pos2


        elmnt.style.top = Math.min(Math.max(topOffset, 0), getHeight() - (elmnt.offsetHeight - 300 )) + "px"
        elmnt.style.left = Math.min(Math.max(leftOffset, 0), getWidth() - elmnt.offsetWidth) + "px"
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}