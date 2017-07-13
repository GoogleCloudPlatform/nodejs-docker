const projectId = process.env.GCLOUD_PROJECT;
const monitoring = require('@google-cloud/monitoring').v3();
const client = monitoring.metricServiceClient();

function createMetric(metricType) {
  const createRequest = {
    name: client.projectPath(projectId),
    metricDescriptor:
        {type: metricType, metricKind: 'GAUGE', valueType: 'INT64'}
  };
  return client.createMetricDescriptor(createRequest);
}

function writeData(metricType, token) {
  const dataPoint = {
    interval: {endTime: {seconds: Date.now() / 1000}},
    value: {int64Value: token}
  };
  const timeSeriesData = {
    metric: {type: metricType},
    resource: {
      type: 'global',
    },
    points: [dataPoint]
  };
  const request = {
    name: client.projectPath(projectId),
    timeSeries: [timeSeriesData]
  };
  return client.createTimeSeries(request);
}

function monitoringTest(metricType, token) {
  return createMetric(metricType).then(() => {
    return writeData(metricType, token);
  });
}

module.exports = monitoringTest;
