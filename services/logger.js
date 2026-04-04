const runtime = require('../config/runtime');

const LOG_KEY = 'mijing_runtime_logs_v1';
const MAX_LOG_COUNT = 200;

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function getLogList() {
  const cached = wx.getStorageSync(LOG_KEY);
  return Array.isArray(cached) ? cached : [];
}

function saveLogList(logs) {
  wx.setStorageSync(LOG_KEY, logs);
  return clone(logs);
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  const seconds = `${date.getSeconds()}`.padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function normalizeError(error) {
  if (!error) {
    return {
      message: 'Unknown error'
    };
  }

  if (typeof error === 'string') {
    return {
      message: error
    };
  }

  return {
    name: error.name || 'Error',
    message: error.message || 'Unknown error',
    stack: error.stack || ''
  };
}

function normalizePayload(payload, depth) {
  if (depth > 3) {
    return '[MaxDepth]';
  }

  if (payload == null) {
    return payload;
  }

  if (payload instanceof Error) {
    return normalizeError(payload);
  }

  if (Array.isArray(payload)) {
    return payload.slice(0, 12).map((item) => normalizePayload(item, depth + 1));
  }

  if (typeof payload === 'object') {
    const result = {};
    Object.keys(payload)
      .slice(0, 20)
      .forEach((key) => {
        result[key] = normalizePayload(payload[key], depth + 1);
      });
    return result;
  }

  return payload;
}

function appendLog(entry) {
  const nextEntry = Object.assign(
    {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now()
    },
    entry
  );

  const logs = getLogList();
  logs.unshift(nextEntry);
  saveLogList(logs.slice(0, MAX_LOG_COUNT));

  if (runtime.enableConsoleLog && typeof console !== 'undefined' && console.log) {
    console.log('[谜境拼图]', nextEntry.type, nextEntry.name || nextEntry.scene || '', nextEntry);
  }

  return nextEntry;
}

function trackEvent(name, payload) {
  if (!runtime.enableTelemetry) {
    return null;
  }

  return appendLog({
    type: 'event',
    name,
    payload: normalizePayload(payload, 0)
  });
}

function captureError(scene, error, extra) {
  if (!runtime.enableErrorLog) {
    return null;
  }

  return appendLog({
    type: 'error',
    scene,
    error: normalizeError(error),
    extra: normalizePayload(extra, 0)
  });
}

function getRecentLogs(limit) {
  return clone(getLogList().slice(0, Math.max(1, limit || 50)));
}

function clearLogs() {
  saveLogList([]);
}

function getLogStats() {
  const logs = getLogList();
  return logs.reduce(
    (result, item) => {
      result.total += 1;
      if (item.type === 'error') {
        result.errors += 1;
      }
      if (item.type === 'event') {
        result.events += 1;
      }
      return result;
    },
    {
      total: 0,
      errors: 0,
      events: 0
    }
  );
}

function getRuntimeMeta() {
  let appId = '';
  let envVersion = 'develop';

  try {
    if (wx.getAccountInfoSync) {
      const accountInfo = wx.getAccountInfoSync();
      const runtimeInfo =
        (accountInfo && (accountInfo.miniProgram || accountInfo.miniGame)) || {};
      appId = runtimeInfo.appId || '';
      envVersion = runtimeInfo.envVersion || 'develop';
    }
  } catch (error) {
    captureError('logger_get_runtime_meta', error);
  }

  return {
    appId,
    envVersion
  };
}

function buildExportText(limit) {
  const payload = {
    generatedAt: formatTimestamp(Date.now()),
    runtime: getRuntimeMeta(),
    stats: getLogStats(),
    logs: getRecentLogs(limit || 80)
  };

  return JSON.stringify(payload, null, 2);
}

module.exports = {
  buildExportText,
  captureError,
  clearLogs,
  getLogStats,
  getRecentLogs,
  trackEvent
};
