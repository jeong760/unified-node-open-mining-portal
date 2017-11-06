var poolHashrateData;

var poolHashrateChart;

var statData = [];
var poolKeys;

var timeHolder;
var columnBuffer = 0;
var poolColors;

function trimData(data, interval) {
    var retentionTime = Date.now() / 1000 - interval | 0;
    if(data.length > 60){
        for (var i = data.length - 1; i >= 0; i--){
            if (retentionTime > data[i].time){
                statData = data.slice(i);
                break;
            }
        }
    } else {
        statData = data;
    }

}

function buildChartData(){
    var pools = {};

    poolKeys = [];
    for (var i = 0; i < statData.length; i++){
        for (var pool in statData[i].pools){
            if (poolKeys.indexOf(pool) === -1)
                poolKeys.push(pool);
        }
    }

    for (var i = 0; i < statData.length; i++){

        var time = statData[i].time * 1000;

        for (var f = 0; f < poolKeys.length; f++){

            var pName = poolKeys[f];

            var a = pools[pName] = (pools[pName] || {
                hashrate: []
            });

            if (pName in statData[i].pools){
                a.hashrate.push([time, statData[i].pools[pName].hashrate]);
            }
            else{
                a.hashrate.push([time, 0]);
            }

        }

    }

    poolHashrateData = [];

    for (var pool in pools){
        poolHashrateData.push({
            key: pool,
            values: pools[pool].hashrate
        });
    }
}

function removeAllSeries() {
    while(poolHashrateChart.series.length > 0)
        poolHashrateChart.series[0].remove();
}

function changeGraphTimePeriod(timePeriod, sender) {
    timeHolder = new Date().getTime();
    removeAllSeries();
    $.getJSON('/api/pool_stats', function (data) {
        trimData(data, timePeriod);
        buildChartData();
        displayCharts();
        console.log("time to changeTimePeriod: " + (new Date().getTime() - timeHolder));
    });

    $('#scale_menu li a').removeClass('pure-button-active');
    $('#' + sender).addClass('pure-button-active');
}

function setHighchartsOptions() {
    Highcharts.setOptions({
        global : {
            useUTC : false
        }
    });
    var graphColors = $('#bottomCharts').data('info');
    if(graphColors !== 'undefined') {
        Highcharts.theme = {
            colors: ['#058DC7', '#50B432', '#ED561B', '#DDDF00', '#24CBE5', '#64E572', 
             '#FF9655', '#FFF263', '#6AF9C4']
        };
        Highcharts.setOptions(Highcharts.theme);
    }
}

function createCharts() {
    setHighchartsOptions();
    poolHashrateChart = new Highcharts.Chart({
        chart: {
            renderTo: 'poolHashRateChart',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            animation: true,
            shadow: false,
            borderWidth: 0,
            zoomType: 'x'
        },
        credits: {
            enabled: false
        },
        exporting: {
            enabled: false
        },
        title: {
            text: ''
        },
        xAxis: {
            type: 'datetime',
            dateTimeLabelFormats: {
                second: '%I:%M:%S %p',
                minute: '%I:%M %p',
                hour: '%I:%M %p',
                day: '%I:%M %p'
            },
            title: {
                text: null
            },
            minRange: 36000
        },
        yAxis: {
            labels: {
                formatter: function () {
                    return getReadableHashRateString(this.value, 'beta');
                }
            },
            title: {
                text: null
            },
            min: 0
        },
        tooltip: {
            shared: true,
            valueSuffix: ' H/s',
            crosshairs: true,
            useHTML: true,
            formatter: function () {
                var s = '<b>' + timeOfDayFormat(this.x) + '</b>';

                var hashrate = 0;
                $.each(this.points, function (i, point) {
                    val = getReadableHashRateString(point.y, 'tooltip');
                    s += '<br/> <span style="color:' + point.series.color + '" x="8" dy="16">&#9679;</span> ' + point.series.name + ': ' + val;
                });
                return s;
            }
        },
        legend: {
            enabled: true,
            borderWidth: 0
        },
        plotOptions: {
			colors: ['#50B432', '#ED561B', '#DDDF00', '#24CBE5', '#64E572', '#FF9655', '#FFF263', '#6AF9C4'],
            area: {
                fillColor: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1},
                    stops: [
                        [0, Highcharts.getOptions().colors[0]],
                        [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
                    ]
                },
                marker: {
                    radius: 2
                },
                lineWidth: 1,
                states: {
                    hover: {
                        lineWidth: 1
                    }
                },
                threshold: null
            }
        },
        series: []
    });
}


function displayCharts(){
    for (var i = 0; i < poolKeys.length; i++) {
        if(poolHashrateChart.series.length < poolKeys.length) {
            poolHashrateChart.addSeries({
                type: 'area',
                name: capitaliseFirstLetter(poolHashrateData[i].key),
                data: poolHashrateData[i].values,
                lineWidth: 2
            }, false);
        }
        if (typeof poolColors !== "undefined") {
            var pName = poolKeys[i].toLowerCase();
            poolHashrateChart.series[i].update({color: poolColors[pName].color}, false);
        }
    }
    poolHashrateChart.redraw();
}

function getInternetExplorerVersion(){
    var rv = -1; // Return value assumes failure.
    if (navigator.appName == 'Microsoft Internet Explorer')
    {
        var ua = navigator.userAgent;
        var re  = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
        if (re.exec(ua) != null)
            rv = parseFloat( RegExp.$1 );
    }
    return rv;
}

function getReadableHashRateString(hashrate, version){
    if(version == 'default') {
        var i = -1;
        var byteUnits = [ ' KH', ' MH', ' GH', ' TH', ' PH' ];
        do {
            hashrate = hashrate / 1024;
            i++;
        } while (hashrate > 1024);
        return Math.round(hashrate) + byteUnits[i];
    } else if(version == 'beta') {
        if (hashrate > Math.pow(1000, 4)) {
            return (hashrate / Math.pow(1000, 4)) + ' TH/s';
        }
        if (hashrate > Math.pow(1000, 3)) {
            return (hashrate / Math.pow(1000, 3)) + ' GH/s';
        }
        if (hashrate > Math.pow(1000, 2)) {
            return (hashrate / Math.pow(1000, 2)) + ' MH/s';
        }
        if (hashrate > Math.pow(1000, 1)) {
            return (hashrate / Math.pow(1000, 1)) + ' KH/s';
        }
        return hashrate + ' H/s';
    } else if(version == 'tooltip') {
        if (hashrate > Math.pow(1000, 4)) {
            return (hashrate / Math.pow(1000, 4)).toFixed(2) + ' TH/s';
        } else if (hashrate > Math.pow(1000, 3)) {
            return (hashrate / Math.pow(1000, 3)).toFixed(2) + ' GH/s';
        } else if (hashrate > Math.pow(1000, 2)) {
            return (hashrate / Math.pow(1000, 2)).toFixed(2) + ' MH/s';
        } else if (hashrate > Math.pow(1000, 1)) {
            return (hashrate / Math.pow(1000, 1)).toFixed(2) + ' KH/s';
        } else {
            return hashrate + ' H/s';
        }
    }
}

function capitaliseFirstLetter(string){
    return string.charAt(0).toUpperCase() + string.substring(1);
}

function timeOfDayFormat(timestamp){
    var tempTime = moment(timestamp).format('MMM Do - h:mm A');
    if (tempTime.indexOf('0') === 0) tempTime = tempTime.slice(1);
    return tempTime;
}

(function ($){
    timeHolder = new Date().getTime();
    var ver = getInternetExplorerVersion();
    if (ver !== -1 && ver<=10.0) {
        $(window).load(function(){
            createCharts();
            $.getJSON('/api/pool_stats', function (data) {
                trimData(data, 3600);
                buildChartData();
                displayCharts();
                console.log("time to load: " + (new Date().getTime() - timeHolder));
            });
        });
    } else {
        $(function() {
            createCharts();
            $.getJSON('/api/pool_stats', function (data) {
                trimData(data, 3600);
                buildChartData();
                displayCharts();
                console.log("time to load: " + (new Date().getTime() - timeHolder));
            });
        });
    }
}(jQuery));

window.statsSource = new EventSource("/api/live_stats");
statsSource.addEventListener('message', function(e){ //Stays active when hot-swapping pages
    var stats = JSON.parse(e.data);
	pulseLiveUpdate();
    statData.push(stats);
    var newpoolAdded = (function(){
        for (var p in stats.pool){
            if (poolKeys.indexOf(p) === -1)
                return true;
        }
        return false;
    })();

    if (newpoolAdded || Object.keys(stats.pool).length > poolKeys.length){
        buildChartData();
    }
    else {
        timeHolder = new Date().getTime(); //Temporary
        var time = stats.time * 1000;

        for (var f = 0; f < poolKeys.length; f++) {
            var pool =  poolKeys[f];
            for (var i = 0; i < poolHashrateData.length; i++) {
                if (poolHashrateData[i].key === pool) {
                    poolHashrateData[i].values.shift();
                    poolHashrateData[i].values.push([time, pool in stats.pool ? stats.pools[pool].hashrate : 0]);
                    if(poolHashrateChart.series[f].name.toLowerCase() === pool) {
                        poolHashrateChart.series[f].setData(poolHashrateData[i].values, true);
                    }
                    break;
                }
            }
        }
    }
    for (var pool in stats.pools) {
        $('#statsValidShares' + pool).text(stats.pools[pool].poolStats.validShares);
        $('#statsInvalidShares' + pool).text(stats.pools[pool].poolStats.invalidShares);
        $('#statsValidBlocks' + pool).text(stats.pools[pool].poolStats.validBlocks);
        $('#statsBlocksPending' + pool).text(stats.pools[pool].blocks.pending);
        $('#statsBlocksConfirmed' + pool).text(stats.pools[pool].blocks.confirmed);
        $('#statsBlocksOrphaned' + pool).text(stats.pools[pool].blocks.orphaned);
    }
    console.log("time to update stats: " + (new Date().getTime() - timeHolder));
});