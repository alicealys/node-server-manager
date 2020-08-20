window.addEventListener('load', () => {
    if (!Profile.ClientId) return
    var socket = new WebSocket(`wss://${window.location.hostname}/?action=socket_listen_messages`)

    socket.addEventListener('message', (e) => {
        var msg = JSON.parse(e.data)
        if (msg.event == 'event_client_message') {
          notifyMe(msg.ServerId, msg.Client, msg.Message)
          if (msg.Client.ClientId != Profile.ClientId) return
          document.getElementById('message-count').innerHTML = parseInt(document.getElementById('message-count').innerHTML) + 1
          logMessage(msg, false)
        }
    })

    document.getElementById('message-log') && document.getElementById('message-log').addEventListener('scroll', async (e) => {
        if (parseInt(document.getElementById('message-log').offsetHeight + document.getElementById('message-log').scrollTop) >= document.body.offsetHeight && pageLoaded && !maxPage) {
            pageLoaded = false
            var nextMessages = JSON.parse(await makeRequest('GET', `/api/messages?id=${Profile.ClientId}&page=${nextPage}&limit=50`))
            nextMessages.forEach(message => {
                message.Client = {}
                message.Client.ClientId = message.OriginId
                message.Client.Name = Profile.Name
                logMessage(message, true, message.Date)
            })
            pageLoaded = true
            nextPage++
            maxPage = (nextMessages.length + 1 < 50)
        }
    })

    document.body.appendChild(parseHTML(`<div id="notifications-cont" class='notification-cont'></div>`))
    var description = document.querySelector('*[data-profile-info]')
    description.innerHTML = description.innerHTML.replace(new RegExp(/<br>/g, 'g'), `\n`)
    var rawText = description.textContent.trim()
    var result = XBBCODE.process({
      text: rawText,
      removeMisalignedTags: true,
      addInLineBreaks: false
    });
    description.innerHTML = result.html

    var submitButton = document.querySelector('*[data-profile-submit]')
    description.addEventListener("paste", function(e) {
      e.preventDefault()
      var text = (e.originalEvent || e).clipboardData.getData('text/plain')
      document.execCommand("insertHTML", false, escapeHtml(text))
  });
    submitButton.addEventListener('click', async (e) => {
      description.innerHTML = description.innerHTML.replace(new RegExp(/<br>/g, 'g'), `\n`)
      var rawText = description.textContent.trim()
      if (rawText.length > 1000) return
      description.setAttribute('data-raw-text', rawText)
      var result = XBBCODE.process({
        text: rawText,
        removeMisalignedTags: true,
        addInLineBreaks: false
      });
      submitButton.style.display = 'none'
      description.innerHTML = result.html
      description.setAttribute('contenteditable', false)
      await makeRequest('POST', `/api/editprofile`, JSON.stringify({description: rawText}), 'application/json')
    })
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

async function getClientWebfrontStatus(ClientId) {
  var socketClients = JSON.parse(await makeRequest('GET', '/api/socketclients', null))
  for (var i = 0; i < socketClients.length; i++) {
    if (socketClients[i].Client == Target.ClientId) {
      return true
    }
  }
  return false
}

function kickClient() {
  messageBox(`Kick ${Profile.Name}`, 
  [
    {type: 'text', name: 'Reason', placeholder: 'Reason'}
  ], 'Cancel', 'Kick', async (params, messageBox, close) => {
    switch (true) {
      case (params.Reason.length <= 0):
        messageBox.querySelector('*[data-text-label]').innerHTML = 'Please provide a reason'
      return
    }
    await makeRequest('GET', `/api/mod?command=COMMAND_KICK&target=${Profile.ClientId}&reason=${params.Reason}`)
    close()
  } 
  )
}

function banClient() {

}

var nextPage = 1
var pageLoaded = true
var maxPage = false

function editProfile() {
  var submitButton = document.querySelector('*[data-profile-submit]')
  submitButton.style.display = 'block'
  var description = document.querySelector('*[data-profile-info]')
  description.setAttribute('contenteditable', true)
  description.textContent = description.getAttribute('data-raw-text')
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

var logMessage = (msg, append, date = new Date()) => {
  var penalties = {
    'PENALTY_TEMP_BAN' : 'Temp banned',
    'PENALTY_PERMA_BAN' : 'Perma banned',
    'PENALTY_KICK' : 'Kicked',
    'PENALTY_UNBAN' : 'Unbanned'
  } 
    switch (msg.Type) {
      case 'Message':
        var msg = (parseHTML(`
        <div class='wf-message'>
            <div class='wf-message-sender'>
                <a class='wf-link wf-message-sender' href='/id/${msg.Client.ClientId}'>${msg.Client.Name}</a>:</div>
                <div class='wf-default wf-message-date'>${moment(date).calendar()}</div>
            <div class='wf-message-message'>${msg.Message}</div>
        </div>
        `))
      break
      case 'Penalty':
        var msg = msg.Target.ClientId == Client.ClientId ? (parseHTML(`
        <div class='wf-message'>
            <div class='wf-default wf-message-date'>${moment(date).calendar()}</div>
            <div class='wf-message-message'><span class='iw-red'>${penalties[msg.PenaltyType]}</span> <span class='iw-yellow'>${msg.Target.ClientId}</span> for <span class='iw-cyan'>${msg.Reason}</span></div>
        </div>
        `)) : (parseHTML(`
        <div class='wf-message'>
            <div class='wf-default wf-message-date'>${moment(date).calendar()}</div>
            <div class='wf-message-message'><span class='iw-red'>${penalties[msg.PenaltyType]}</span> by <span class='iw-yellow'>${msg.Origin.ClientId}</span> for <span class='iw-cyan'>${msg.Reason}</span></div>
        </div>
        `))
      break
      default:
        var msg = (parseHTML(`
        <div class='wf-message'>
            <div class='wf-message-sender'>
                <a class='wf-link wf-message-sender' href='/id/${msg.Client.ClientId}'>${msg.Client.Name}</a>:</div>
                <div class='wf-default wf-message-date'>${moment(date).calendar()}</div>
            <div class='wf-message-message'>${msg.Message}</div>
        </div>
        `))
      break
    }

    append ? document.getElementById('message-log').appendChild(msg) : document.getElementById('message-log').prepend(msg)
}

var parseHTML = (html) => {
    var t = document.createElement('template');
    t.innerHTML = html;
    return t.content.cloneNode(true);
}
