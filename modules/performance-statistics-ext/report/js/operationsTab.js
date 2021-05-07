/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const CACHE_OPERATIONS = ["CACHE_GET", "CACHE_PUT", "CACHE_REMOVE", "CACHE_GET_AND_PUT", "CACHE_GET_AND_REMOVE",
    "CACHE_GET_ALL", "CACHE_PUT_ALL", "CACHE_REMOVE_ALL", "CACHE_INVOKE", "CACHE_INVOKE_ALL", "CACHE_LOCK"];

const CACHE_OPERATIONS_READABLE = ["get", "put", "remove", "getAndPut", "getAndRemove",
    "getAll", "putAll", "removeAll","invoke", "invokeAll", "lock"];

const CACHE_OPERATIONS_COLORS = {
    CACHE_GET: "#007bff",
    CACHE_PUT: "#4661EE",
    CACHE_REMOVE: "#EC5657",
    CACHE_GET_AND_PUT: "#c02332",
    CACHE_GET_AND_REMOVE: "#9d71e4",
    CACHE_GET_ALL: "#8357c7",
    CACHE_PUT_ALL: "#1BCDD1",
    CACHE_REMOVE_ALL: "#23BFAA",
    CACHE_INVOKE: "#F5A52A",
    CACHE_INVOKE_ALL: "#fd7e14",
    CACHE_LOCK: "#FAA586"
};

const CHECKPOINT_COLORS = {
    CHECKPOINT: "#008000",
    PAGES_WRITE_THROTTLE: "#c02332",
}

const LABELS = {
    pagesWriteThrottle: 'Pages write throttle',
    checkpoints: 'Checkpoints'
}

const searchCachesSelect = $('#searchCaches');
const searchNodesSelect = $('#searchNodes');
const searchNodesCPsSelect = $('#searchNodesCPs');

let opsCountPerType = {};

function getLabel(ctx) {
    switch (ctx.dataset.label) {
        case LABELS.pagesWriteThrottle:
            return ["Count per second: " + ctx.raw.d.counter,
                "Total duration: " + ctx.raw.d.duration + " ms.",
                "Node ID: " + ctx.raw.d.nodeId]

        default:
            return "Count: " + ctx.parsed.y
    }
}

function drawCacheCharts() {
    $("#operationsCharts").empty();

    let nodeIdCP = searchNodesCPsSelect.val()

    $.each(CACHE_OPERATIONS, function (k, opName) {
        opsCountPerType[opName] = 0;

        var chartId = opName + "OperationChart";

        $("#operationsCharts").append('<canvas class="my-4" ' + 'id="' + chartId + '" height="120"/>');

        let chart = new Chart(document.getElementById(chartId), {
                type: 'line',
                data: {
                    datasets: prepareCacheDatasets(opName),
                },
                options: {
                    responsive: true,
                    interaction: {
                        mode: 'nearest',
                    },
                    plugins: {
                        legend: {
                            display: true,
                            onClick: (e, legendItem, legend) => {
                                let index = legendItem.datasetIndex;

                                if (legendItem.text === LABELS.checkpoints) {
                                    if(legendItem.hidden)
                                        chart.options.annotations = getCheckointsBoxes(nodeIdCP, chart.scales.y.end)
                                    else
                                        chart.options.annotations = []
                                }

                                let ci = legend.chart;

                                let meta = ci.getDatasetMeta(index)

                                meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null

                                ci.update();
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (i) => getLabel(i),
                            }
                        },
                        title: {
                            display: true,
                            text: "Count of [" + CACHE_OPERATIONS_READABLE[k] + "]",
                            fontSize: 20
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            type: 'time',
                            time: {
                                displayFormats: {
                                    'millisecond': 'HH:mm:ss',
                                    'second': 'HH:mm:ss',
                                    'minute': 'HH:mm:ss',
                                    'hour': 'HH:mm'
                                }
                            },
                            title: {
                                display: true,
                                text: 'Date'
                            },
                            adapters: {
                                data: {
                                    locale: 'date-fns/locale'
                                }
                            }
                        },
                        y: {
                            display: true,
                            title: {
                                display: true,
                                text: 'Сount of operations'
                            },
                            suggestedMin: 0,
                            suggestedMax: 10
                        },
                        y1: {
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Сount of pages write throttle'
                            },
                            suggestedMin: 0,
                            suggestedMax: 10
                        }
                    },
                    animation: false
                }
            })

            chart.options.annotations = getCheckointsBoxes(nodeIdCP, chart.scales.y.end)
            chart.update()
        }
    );

    drawCacheBar();
}

function getCheckointsBoxes(nodeId, yMax) {
    let boxes = []

    let checkpoints = REPORT_DATA.checkpointsInfo.checkpoints

    if (checkpoints === undefined || !nodeId)
        return boxes;

    checkpoints.forEach(function (cp) {

        if (nodeId === "total" || nodeId === cp.nodeId) {
            boxes.push(getBox(cp.cpStartTime, cp.cpStartTime + cp.totalDuration, 0, yMax, cp))
        }
    });

    return boxes
}

function getBox(xMin, xMax, yMin, yMax, cp) {
    let box = {
        drawTime: 'afterDatasetsDraw',
        type: 'box',
        xMin: xMin,
        xMax: xMax,
        yMin: yMin,
        yMax: yMax,
        borderWidth: 1,
        borderColor: CHECKPOINT_COLORS.CHECKPOINT,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        label: {
            content: getCheckpointInfoArr(cp),
            textAlign: 'start',
            position: "top"
        },
        enter: (e) => {
            box.label.enabled = true
            box.borderWidth = 3
            box.yMax = e.chart.scales.y.end
            e.chart.update()
        },

        leave: (e) => {
            box.label.enabled = false
            box.borderWidth = 1
            e.chart.update()
        },
    }

    return box;
}

function getCheckpointInfoArr(cp) {
    return [
        'Checkpoint start time: ' + new Date(cp.cpStartTime).toLocaleTimeString(),
        'Total duration: ' + cp.totalDuration / 1000 + ' s.',
        'Number of dirty pages: ' + cp.pagesSize,
        'Node ID: ' + cp.nodeId,
        '',
        'Before lock duration: ' + cp.beforeLockDuration + ' ms.',
        'Lock wait duration: ' + cp.lockWaitDuration + ' ms.',
        'Listeners exec duration: ' + cp.listenersExecDuration + ' ms.',
        'Mark duration: ' + cp.markDuration + ' ms.',
        'Lock hold duration: ' + cp.lockHoldDuration + ' ms.',
        'Pages write duration: ' + cp.pagesWriteDuration + ' ms.',
        'Fsync duration: ' + cp.fsyncDuration + ' ms.',
        'Wal checkpoint record fsync duration: ' + cp.walCpRecordFsyncDuration + ' ms.',
        'Write checkpoint entry duration: ' + cp.writeCheckpointEntryDuration + ' ms.',
        'Split and sort checkpoint pages duration: ' + cp.splitAndSortCpPagesDuration + ' ms.',
        'Data pages written: ' + cp.dataPagesWritten,
        'Copy on write pages written: ' + cp.cowPagesWritten
    ]
}

function prepareCacheDatasets(opName) {
    var cacheId = searchCachesSelect.val();
    var nodeId = searchNodesSelect.val();

    var datasets = [];

    var cacheOps = REPORT_DATA.cacheOps[nodeId] === undefined ? undefined : REPORT_DATA.cacheOps[nodeId][cacheId];

    if (cacheOps === undefined)
        return datasets;

    var datasetData = [];

    $.each(cacheOps[opName], function (k, arr) {
        datasetData.push({x: parseInt(arr[0]), y: arr[1]});

        opsCountPerType[opName] += arr[1];
    });

    sortByKeyAsc(datasetData, "x");

    var dataset = {
        data: datasetData,
        label: "Count of " + opName,
        lineTension: 0,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 1,
        borderColor: CACHE_OPERATIONS_COLORS[opName],
        pointBackgroundColor: CACHE_OPERATIONS_COLORS[opName],
    };

    datasets.push(dataset);

    let nodeIdCP = searchNodesCPsSelect.val()

    if (nodeIdCP) {
        datasets.push(getCheckpointDataset())
        datasets.push(getPagesWriteThrottleDataset(nodeIdCP))
    }

    return datasets;
}

function getCheckpointDataset() {
    return {
        type: 'bar',
        data: [],
        label: LABELS.checkpoints,
        backgroundColor: CHECKPOINT_COLORS.CHECKPOINT,
        borderColor: CHECKPOINT_COLORS.CHECKPOINT,
        pointBackgroundColor: CHECKPOINT_COLORS.CHECKPOINT,
    }
}

function drawCacheBar() {
    $("#operationsCharts").prepend('<canvas class="my-4" id="operationBarChart" height="60"/>');

    var data = [];
    var colors = [];

    $.each(CACHE_OPERATIONS, function (k, opName) {
        data[k] = opsCountPerType[opName];
        colors[k] = CACHE_OPERATIONS_COLORS[opName];
    });

    new Chart(document.getElementById("operationBarChart"), {
        type: 'bar',
        data: {
            datasets: [{
                data: data,
                backgroundColor: colors,
                label: 'Total count',
            }],
            labels: CACHE_OPERATIONS
        },
        options: {
            scales: {
                x: {
                    barPercentage: 0.4
                },
                y: {
                    title: {
                        display: true,
                        text: 'Count'
                    },
                    suggestedMin: 0,
                    suggestedMax: 10
                }
            },
            title: {
                display: true,
                text: 'Distribution of count operations by type',
                fontSize: 20
            },
            animation: false,
        }
    });
}

function getPagesWriteThrottleDataset(nodeId) {
    let pagesWriteThrottle = REPORT_DATA.checkpointsInfo.pagesWriteThrottle

    if (pagesWriteThrottle === undefined)
        return {};

    let datasetData = [];

    pagesWriteThrottle.forEach(function (th) {

        if (nodeId === "total" || nodeId === th.nodeId) {
            datasetData.push({x: th.time, y: th.counter, d: th});
        }
    });

    sortByKeyAsc(datasetData, "x");

    let dataset = {
        type: 'bubble',
        data: datasetData,
        label: LABELS.pagesWriteThrottle,
        fill: false,
        backgroundColor: CHECKPOINT_COLORS.PAGES_WRITE_THROTTLE,
        borderColor: CHECKPOINT_COLORS.PAGES_WRITE_THROTTLE,
        yAxisID: 'y1'
    };

    return dataset
}

buildSelectCaches(searchCachesSelect, drawCacheCharts, 'All nodes');
buildSelectNodes(searchNodesSelect, drawCacheCharts, 'All nodes');
buildSelectNodes(searchNodesCPsSelect, drawCacheCharts, 'All checkpoint nodes');
searchNodesCPsSelect.append('<option data-content="<b>' + 'NONE' + '</b>"/>');

drawCacheCharts();
