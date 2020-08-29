window.addEventListener('load', () => {
    var info = document.querySelector('.wf-info-text')
    info.addEventListener("paste", function(e) {
        e.preventDefault()
        var text = (e.originalEvent || e).clipboardData.getData('text/plain')
        document.execCommand("insertHTML", false, escapeHtml(text))
    })
})

function infoEdit() {
    var info = document.querySelector('.wf-info-text')
    if (info.getAttribute('contenteditable') == 'true') {
        submitInfo(info)
        return
    }
    info.innerHTML = info.getAttribute('data-raw-text')
    info.setAttribute('contenteditable', true)
}

async function xbbFormat(el) {
    var rawText = await replacePlaceholders(el.textContent.trim())
    var result = XBBCODE.process({
      text: rawText,
      removeMisalignedTags: true,
      addInLineBreaks: false
    })
    el.innerHTML = result.html
}

var escapeHtml = (text) => {
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function submitInfo(info) {
    info.innerHTML = info.innerHTML.replace(new RegExp(/<br>/g, 'g'), `\n`).replace(/\uFFFD/g, '').replace(/&nbsp;/g, ' ')
    info.setAttribute('data-raw-text', info.textContent.trim())
    xbbFormat(info)
    info.setAttribute('contenteditable', false)
    makeRequest('GET', `/api/admin?command=COMMAND_CHANGE_INFO&value=${JSON.stringify({value: btoa(info.getAttribute('data-raw-text'))})}`, null)
}