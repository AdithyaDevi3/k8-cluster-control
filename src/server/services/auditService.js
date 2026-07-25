const MAX_EVENTS = 100;
const events = [];

function recordEvent(clusterId, type, details = {}) {
  const event = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    clusterId,
    type,
    timestamp: new Date().toISOString(),
    ...details
  };
  events.unshift(event);
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
  return event;
}

function getEvents(clusterId, limit = 20) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  return events.filter((event) => event.clusterId === clusterId).slice(0, safeLimit);
}

module.exports = { recordEvent, getEvents };