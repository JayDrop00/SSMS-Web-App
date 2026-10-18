const activeRequests = new Map();

function register(executionId, request) {
  if (!executionId || !request) return;
  activeRequests.set(String(executionId), request);
}

function remove(executionId) {
  if (!executionId) return;
  activeRequests.delete(String(executionId));
}

function cancel(executionId) {
  const request = activeRequests.get(String(executionId));
  if (!request) return false;
  request.cancel();
  return true;
}

module.exports = { register, remove, cancel };
