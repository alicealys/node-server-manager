window.onscroll = async (ev) => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight && !maxPage && pageLoaded) {
        pageLoaded = false
        var nextStats = JSON.parse(await makeRequest('GET', `/api/stats?&page=${nextPage}`))
        appendStats(nextStats)
        pageLoaded = true
        nextPage++
        maxPage = (nextStats.length + 1 < 10)
    }
}

var nextPage = 1
var pageLoaded = true
var maxPage = false

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

var appendStats = (Stats) => {
    Stats.forEach(Stat => {
        document.getElementById('stat-list').appendChild((parseHTML(`
        <div class='wf-stat'>
          <div>
            <div class='wf-stat-name wf-stat-line'><span class='api-data-type'>#${Stat.Rank} - </span><a href='/id/${Stat.ClientId}' class='wf-stat-name wf-link'>${Stat.Name}</a></div>
            <div class='wf-stat-line'><span class='api-data-type'>${Stat.Kills}</span> Kills</div>
            <div class='wf-stat-line'><span class='api-data-type'>${Stat.Deaths}</span> Deaths</div>
            <div class='wf-stat-line'><span class='api-data-type'>${(Stat.Kills / Math.max(Stat.Deaths, 1)).toFixed(2)}</span> KDR</div>
            <div class='wf-stat-line'><span class='api-data-type'>${Stat.Performance.toFixed(1)}</span> Performance</div>
            <div class='wf-stat-line'>Played for <span class='api-data-type'>${Stat.PlayedTimeString}</span></div>
        </div>
        <div><div class='wf-stat-chart' id='${Stat.ClientId}_history'></div></div>
        </div>
        `)))
        renderPerformanceChart(`${Stat.ClientId}_history`, Stat.History, true, '#D5D0C7')
    })
}

var parseHTML = (html) => {
    var t = document.createElement('template');
    t.innerHTML = html;
    return t.content.cloneNode(true);
}