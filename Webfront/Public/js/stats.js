window.onscroll = async (ev) => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight && !maxPage && pageLoaded) {
        pageLoaded = false
        var sort = getParams().sort
        var nextStats = JSON.parse(await makeRequest('GET', `/api/stats?&page=${nextPage}&limit=50&sort=${sort}`))
        appendStats(nextStats)
        pageLoaded = true
        nextPage++
        maxPage = (nextStats.length + 1 < 50)
    }
};

function getParams() {
    var queryDict = {}
    location.search.substr(1).split("&").forEach(function(item) {queryDict[item.split("=")[0]] = item.split("=")[1]})
    return queryDict;
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
        <div class='wf-client-search-client'>
            <a class='wf-search-name' href='/id/${Stat.ClientId}'>${Stat.Name}</a>
            <div class='wf-search-level' data-value='${Stat.Kills}'>${Stat.Kills}</div>
            <div class='wf-search-level' data-value='${Stat.Deaths}'>${Stat.Deaths}</div>
            <div class='wf-search-level' data-value='${Stat.KDR}'>${Stat.KDR}</div>
            <div class='wf-search-level' data-value='${Stat.Performance}'>${Stat.Performance}</div>
            <div class='wf-search-level' data-value='${Stat.PlayedTime}'>${Stat.PlayedTimeString}</div>
        </div>
        `)))
    })
}

var parseHTML = (html) => {
    var t = document.createElement('template');
    t.innerHTML = html;
    return t.content.cloneNode(true);
}