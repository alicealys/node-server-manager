window.onscroll = async (ev) => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight && !maxPage && pageLoaded) {
        pageLoaded = false
        var nextStats = JSON.parse(await makeRequest('GET', `/api/zstats?&page=${nextPage}`))
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
            <div class='wf-stat-line'><span class='api-data-type'>${Stat.Kills}</span> ${Stat.Kills == 1 ? 'Kill' : 'Kills'}</div>
            <div class='wf-stat-line'><span class='api-data-type'>${Stat.Downs}</span> ${Stat.Downs == 1 ? 'Down' : 'Downs'}</div>
            <div class='wf-stat-line'><span class='api-data-type'>${Stat.Revives}</span> ${Stat.Revives == 1 ? 'Revive' : 'Revives'}</div>
            <div class='wf-stat-line'><span class='api-data-type'>${Stat.Headshots}</span> ${Stat.Headshots == 1 ? 'Headshot' : 'Headshots'}</div>
            <div class='wf-stat-line'><span class='api-data-type'>${Stat.Score}</span> Score</div>
        </div>
        <div class='wf-stat-round'>${Stat.HighestRound}</div>
        </div>
        `)))
    })
}

var parseHTML = (html) => {
    var t = document.createElement('template');
    t.innerHTML = html;
    return t.content.cloneNode(true);
}