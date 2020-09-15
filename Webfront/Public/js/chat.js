window.addEventListener('load', () => {
    var wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws'
    var socket = new WebSocket(`${wsProtocol}://${window.location.hostname}/?action=socket_listen_messages`)
    socket.onopen = () => {
        setInterval(() => {
            socket.send(JSON.stringify({action: 'heartbeat'}))
        }, 5000)
    }
      socket.addEventListener('message', (e) => {
          var msg = JSON.parse(e.data)
          if (msg.event == 'event_client_message') {
            logMessage(msg.Message, msg.Client.Name, msg.Client.ClientId, msg.Hostname, new Date(), false)
          }

      })
      var nextPage = 1
      var pageLoaded = true
      var maxPage = false
      var previousDate = new Date()
      document.getElementById('message-log') && document.getElementById('message-log').addEventListener('scroll', async (e) => {
        var log = document.getElementById('message-log')
        if (log.scrollTop + 50 >= (log.scrollHeight - log.offsetHeight) && pageLoaded && !maxPage) {
            pageLoaded = false
            var nextMessages = JSON.parse(await makeRequest('GET', `/api/messages?&page=${nextPage}&limit=50`))
            nextMessages.forEach(Message => {
                if ( ( previousDate - new Date(Message.Date) ) / 1000 / 60 / 30 >= 1) { 
                    previousDate = new Date(Message.Date)
                    addSeparator(new Date(Message.Date))
                }
                logMessage(Message.Message, Message.Name, Message.ClientId, Message.Hostname, new Date(Message.Date), true)
            })
            pageLoaded = true
            nextPage++
            maxPage = (nextMessages.length + 1 < 50)
        }
    })
  })

function addSeparator(Date) {
    var msg = createElementFromHTML(
        `<div class='wf-chat-separator-wrap'>
        <div class='wf-chat-separator'>
            <span date-moment>${moment(Date).calendar()}</span>
        </div>
    </div>`
    )
    document.getElementById('message-log').appendChild(msg)
}

function logMessage(Message, Name, ClientId, Hostname, Date, Append) {
    var msg = createElementFromHTML(
        `<div class='wf-message'>
            <div class='wf-message-sender'>
                <a class='wf-link wf-message-sender' href='/id/${ClientId}' colorcode>${Name}</a> @ <span class='api-data-type'>${COD2HTML(Hostname, '')}</span>:</div>
            <div class='wf-message-message'>${COD2HTML(Message, '')}</div>
            <div class='wf-default wf-message-date' date-moment>${moment(Date).calendar()}</div>
        </div>`
    )
    Append ? document.getElementById('message-log').appendChild(msg) : document.getElementById('message-log').prepend(msg) 
}

function createElementFromHTML(htmlString) {
    var div = document.createElement('div');
    div.innerHTML = htmlString.trim();
    return div.firstChild; 
  }