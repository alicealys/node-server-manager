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
          <div class='wf-stat-line'><span class='api-data-type'>${Stat.Kills}</span> ${Stat.Kills == 1 ? 'Kill' : 'Kills'}</div>
          <div class='wf-stat-line'><span class='api-data-type'>${Stat.Deaths}</span> ${Stat.Deaths == 1 ? 'Death' : 'Deaths'}</div>
          <div class='wf-stat-line'><span class='api-data-type'>${(Stat.Kills / Math.max(Stat.Deaths, 1)).toFixed(2)}</span> KDR</div>
          <div class='wf-stat-line'><span class='api-data-type'>${Stat.Performance.toFixed(1)}</span> Performance</div>
          <div class='wf-stat-line'>Played for <span class='api-data-type'>${Stat.PlayedTimeString}</span></div>
      </div>
      <div><div class='wf-stat-chart' id='${Stat.ClientId}_history'></div></div>
      </div>
      `)))

      for (var i = 0; i < Stat.History.length; i++) {
        Stat.History[i].x = i
      }

      renderPerformanceChart(`${Stat.ClientId}_history`, Stat.History, true, '#D5D0C7')
  })
}

var parseHTML = (html) => {
  var t = document.createElement('template');
  t.innerHTML = html;
  return t.content.cloneNode(true);
}

window.addEventListener('load', async () => {
document.querySelectorAll('*[data-canvas]').forEach(canvas => {
    var data = JSON.parse(canvas.getAttribute('data-canvas'))

    for (var i = 0; i < data.length; i++) {
      data[i].x = i
    }

    console.log(data)

    parseInt(canvas.getAttribute('data-rank')) > 3 ? renderPerformanceChart(canvas.id, data, true, '#D5D0C7') : renderPerformanceChart(canvas.id, data, true, '#0C0D0E')
})
})

function renderPerformanceChart(id, data, animation, color) {
var chart = new CanvasJS.Chart(id, {
    theme: "dark1", // "light1", "light2", "dark1", "dark2"
    defaultFontFamily: "codef",
    animationEnabled: animation,
    backgroundColor: "transparent",
    zoomEnabled: false,
    height:150,
    title: {
        text: 'Performance History',
        fontFamily: "codef",
        fontColor: color,
    },
    fontFamily: "codef",
    xValueType: "number",
    toolTip: {
        cornerRadius: 5,
        fontFamily: "codef",
        contentFormatter: function (e) {
            return e.entries[0].dataPoint.y.toFixed(1)
        }
    },
    axisX: {
        interval: 1,
        gridThickness: 0,
        lineThickness: 1,
        tickThickness: 0,
        margin: 0,
        valueFormatString: " "
    },
       axisY: {
        gridThickness: 0,
        lineThickness: 0,
        tickThickness: 0,
        margin: 0,
        valueFormatString: "",
        labelMaxWidth: 100,
        labelFontColor: color,
        labelFontFamily: 'codef',
    },
    fontColor: color,
    data: [{
        showInLegend: false,
        type: "splineArea",
        color: color,
        markerSize: 0,
        dataPoints: data
    }]
});
chart.render()
document.getElementById(id).offsetWidth;
} 