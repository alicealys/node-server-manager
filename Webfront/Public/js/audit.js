window.addEventListener('load', async () => {
    var nextPage = 1
    var pageLoaded = true
    var maxPage = false
    window.addEventListener('scroll', async () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight && pageLoaded && !maxPage) {

            pageLoaded = false
            var nextMessages = JSON.parse(await makeRequest('GET', `/api/audit?page=${nextPage}&limit=25`))
            nextMessages.forEach(log => {
                logAudit(log)
            })
            pageLoaded = true
            nextPage++
            maxPage = (nextMessages.length + 1 < 25)
        }
    })
})

function logAudit(log) {
    if (!log) return
    document.getElementById('audit-cont').appendChild(createElementFromHTML(`
        <div class='wf-table-row' id='audit-cont'>
            ${log.Origin.ClientId ? `<a class='wf-link' href='/id/${log.Origin.ClientId}'>${log.Origin.Name}</a>` : `<div>${log.Origin.Name}</div>`}
            <div>${log.Type}</div>
            <div>${log.Description}</div>
            <div>${moment(new Date(log.Date).toISOString()).calendar()}</div>
        </div>
    `))
}