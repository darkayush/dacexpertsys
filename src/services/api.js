const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function buildUrl(path) {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (base.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${base}${normalizedPath.slice(4)}`;
  }

  return `${base}${normalizedPath}`;
}

function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function fetchJson(path, options = {}) {
  const response = await fetch(buildUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const payload = await response.json();
      if (payload?.error) message = payload.error;
    } catch {
      // Ignore JSON parse failures; keep default message.
    }
    throw new Error(message);
  }

  return response.json();
}

export async function loginWithCredentials(email, password) {
  return fetchJson('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function loginWithGoogle(credential) {
  return fetchJson('/api/login/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });
}

export async function changePassword({ userId, currentPassword, newPassword }) {
  return fetchJson('/api/change-password', {
    method: 'POST',
    body: JSON.stringify({ userId, currentPassword, newPassword }),
  });
}

export async function getUsers(options = {}) {
  const params = new URLSearchParams();
  if (options.excludeRole) {
    params.set('excludeRole', String(options.excludeRole));
  }
  const query = params.toString();
  return fetchJson(`/api/users${query ? `?${query}` : ''}`);
}

export async function updateUserRole(userId, role) {
  return fetchJson(`/api/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

export async function resetUserPassword(userId) {
  return fetchJson(`/api/users/${userId}/reset-password`, {
    method: 'POST',
  });
}

export async function createCase(payload) {
  return fetchJson('/api/cases', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getCaseById(caseId) {
  return fetchJson(`/api/cases/${caseId}`);
}

export async function updateCase(caseId, payload) {
  return fetchJson(`/api/cases/${caseId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteCase(caseId) {
  return fetchJson(`/api/cases/${caseId}`, {
    method: 'DELETE',
  });
}

export async function uploadEvidence(file, options = {}) {
  const formData = new FormData();
  formData.append('file', file);
  if (options.caseId) {
    formData.append('case_id', String(options.caseId));
  }

  const response = await fetch(buildUrl('/api/cases/upload-evidence'), {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const payload = await response.json();
      if (payload?.error) message = payload.error;
    } catch {
      // Ignore JSON parse failures.
    }
    throw new Error(message);
  }

  return response.json();
}

export async function approveCase(caseId) {
  return fetchJson(`/api/cases/${caseId}/approve`, {
    method: 'PUT',
  });
}

export async function getCaseTimeline(caseId) {
  return fetchJson(`/api/cases/${caseId}/timeline`);
}

export async function createCaseTimeline(caseId, payload) {
  return fetchJson(`/api/cases/${caseId}/timeline`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCaseTimeline(caseId, timelineId, payload) {
  return fetchJson(`/api/cases/${caseId}/timeline/${timelineId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteCaseTimeline(caseId, timelineId) {
  return fetchJson(`/api/cases/${caseId}/timeline/${timelineId}`, {
    method: 'DELETE',
  });
}

export async function getCases(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return fetchJson(`/api/cases${queryString ? `?${queryString}` : ''}`);
}

export async function getCaseHistory(limit = 6) {
  return fetchJson(`/api/cases/history?limit=${encodeURIComponent(limit)}`);
}

export async function getEvidence(options = {}) {
  const params = new URLSearchParams();
  if (options.caseId) {
    params.set('case_id', String(options.caseId));
  }
  const query = params.toString();
  return fetchJson(`/api/evidence${query ? `?${query}` : ''}`);
}

export async function getEvidenceById(evidenceId) {
  return fetchJson(`/api/evidence/${evidenceId}`);
}

export async function updateEvidence(evidenceId, payload) {
  return fetchJson(`/api/evidence/${evidenceId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteEvidence(evidenceId) {
  return fetchJson(`/api/evidence/${evidenceId}`, {
    method: 'DELETE',
  });
}

export async function createNotifications(payload) {
  return fetchJson('/api/notifications/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getNotifications() {
  return fetchJson('/api/notifications');
}

export async function markNotificationRead(notificationId) {
  return fetchJson(`/api/notifications/${notificationId}/read`, {
    method: 'PUT',
  });
}

export async function updateNotification(notificationId, payload) {
  return fetchJson(`/api/notifications/${notificationId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteNotification(notificationId) {
  return fetchJson(`/api/notifications/${notificationId}`, {
    method: 'DELETE',
  });
}

export async function getRules() {
  return fetchJson('/api/rules');
}

export async function createRule(payload) {
  return fetchJson('/api/rules', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateRule(ruleId, payload) {
  return fetchJson(`/api/rules/${ruleId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteRule(ruleId) {
  return fetchJson(`/api/rules/${ruleId}`, {
    method: 'DELETE',
  });
}

export async function seedRules(payload) {
  return fetchJson('/api/rules/seed', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createUser(payload) {
  return fetchJson('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getUserById(userId) {
  return fetchJson(`/api/users/${userId}`);
}

export async function updateUser(userId, payload) {
  return fetchJson(`/api/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(userId) {
  return fetchJson(`/api/users/${userId}`, {
    method: 'DELETE',
  });
}
