window.addEventListener('load', () => {
  var wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws'
  var socket = new WebSocket(`${wsProtocol}://${window.location.hostname}/?action=socket_listen_messages`)

    socket.addEventListener('message', (e) => {
        var msg = JSON.parse(e.data)
        if (msg.event == 'event_client_message') {
            notifyMe(msg.ServerId, msg.Client, msg.Message)
        }
    })
    document.body.appendChild(parseHTML(`<div id="notifications-cont" class='notification-cont'></div>`))
})

function parseHTML(html) {
  var t = document.createElement('template');
  t.innerHTML = html;
  return t.content.cloneNode(true);
}

async function notifyMe(ServerId, Client, Message) {
  const notifications = document.getElementById("notifications-cont")
  var n = document.createDocumentFragment()
  var status = JSON.parse(await makeRequest('GET', `/api/players?ServerId=${ServerId}`))
  Message = escapeHtml(Message);
  var notif = createElementFromHTML(`
  <div class='notification-notif notifFadeIn notifFadeOut'>
      <div class='notification-icon'></div>
      <div class='notification-textcontent'>
          <div class='notification-user'><div><a href='/id/${Client.ClientId}' class='wf-link wf-bold'>${Client.Name}</a> @ <div class='wf-notif-hostname' data-colorcode>${parseCODColorCodes(status.Dvars.Hostname, 'var(--color-text)').outerHTML}</div></div></div>
          <pre class='notification-text'>${Message}</pre>
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

function escapeHtml(text) {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
function makeRequest (method, url, data, contentType = null) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest()
      xhr.open(method, url, true)
      contentType && xhr.setRequestHeader('Content-type', contentType)
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
