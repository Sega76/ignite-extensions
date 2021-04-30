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

const TX_OPERATIONS = ["commit", "rollback"];

const TX_COLORS = {
    commit: "#1BCDD1",
    rollback: "#007bff"
};

const txSearchCachesSelect = $('#txSearchCaches');
const txSearchNodesSelect = $('#txSearchNodes');
const txSearchNodesCPSelect = $('#txSearchNodesCPs');
const txCharts = $("#txCharts");

function drawTxCharts() {
    var cacheId = txSearchCachesSelect.val();
    var nodeId = txSearchNodesSelect.val();
    var nodeIdCP = txSearchNodesCPSelect.val()

    txCharts.empty();

    $.each(TX_OPERATIONS, function (k, opName) {
        var txChartId = opName + "TxChart";

        txCharts.append('<canvas class="my-4" id="' + txChartId + '" height="120""></canvas>');

        new Chart(document.getElementById(txChartId), {
            type: 'line',
            data: {
                datasets: prepareTxDatasets(nodeId, cacheId, opName)
            },
            options: {
                annotations: getCheckointsBoxes(nodeIdCP),
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (i) => getLabel(i),
                        }
                    },
                    title: {
                        display: true,
                        text: "Count of [" + opName + "]",
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
    });

    txCharts.prepend('<canvas class="my-4" id="txHistogram" height="80""></canvas>');

    new Chart(document.getElementById("txHistogram"), {
        type: 'bar',
        data: {
            labels: buildTxHistogramBuckets(),
            datasets: prepareTxHistogramDatasets(nodeId, cacheId)
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: "Histogram of transaction durations",
                    fontSize: 20
                }
            },
            scales: {
                x:{
                    gridLines: {
                        offsetGridLines: true
                    },
                    title: {
                        display: true,
                        text: 'Duration of transaction'
                    }
                },
                y:{
                    display: true,
                    title: {
                        display: true,
                        text: 'Count of transactions'
                    }
                }
            },
            animation: false
        }
    });
}

function prepareTxHistogramDatasets(nodeId, cacheId) {
    let datasets = [];

    let datasetData = REPORT_DATA.txHistogram[nodeId] === undefined ? undefined : REPORT_DATA.txHistogram[nodeId][cacheId];

    if (datasetData === undefined)
        return datasets;

    let dataset = {
        label: 'Count of transactions',
        data: datasetData,
        backgroundColor: '#FAA586',
    };

    datasets.push(dataset);

    return datasets;
}

function prepareTxDatasets(nodeId, cacheId, opName) {
    let datasets = [];

    let txData = REPORT_DATA.tx[nodeId] === undefined ? undefined : REPORT_DATA.tx[nodeId][cacheId];

    if (txData === undefined)
        return datasets;

    let datasetData = [];

    $.each(txData[opName], function (time, arr) {
        datasetData.push({x: parseInt(arr[0]), y: arr[1]})
    });

    sortByKeyAsc(datasetData, "x");

    let dataset = {
        data: datasetData,
        label: "Count of " + opName,
        lineTension: 0,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 1,
        borderColor: TX_COLORS[opName],
        pointBackgroundColor: TX_COLORS[opName]
    };

    datasets.push(dataset);

    datasets.push(getThrottlingDataset(txSearchNodesCPSelect.val()))

    return datasets;
}

function buildTxHistogramBuckets() {
    var buckets = [];

    var lastVal = 0;

    $.each(REPORT_DATA.txHistogramBuckets, function (idx, value) {
        buckets.push(lastVal + " to " + value + " ms");
        lastVal = value;
    });

    buckets.push(lastVal + " ms or more");

    return buckets;
}

buildSelectCaches(txSearchCachesSelect, drawTxCharts, 'All nodes');
buildSelectNodes(txSearchNodesSelect, drawTxCharts, 'All nodes');
buildSelectNodes(txSearchNodesCPSelect, drawTxCharts, 'All checkpoint nodes');
txSearchNodesCPSelect.append('<option data-content="<b>'+'NONE'+'</b>"/>');

drawTxCharts();
