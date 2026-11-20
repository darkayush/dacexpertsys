// Dev: Vite (5173) talks to the backend on 5000. Production: the backend serves
// the built frontend, so API calls go to the same origin.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:5000' : '');

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

/**
 * Group incident: one separate case per student, sharing the incident details.
 * payload: { students: [{ student_id, location }], offense_type, ...shared fields }
 * Returns { incident_group_id, cases: [case, ...] }.
 */
export async function createGroupCases(payload) {
  return fetchJson('/api/cases/group', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Other cases from the same group incident (staff only). */
export async function getGroupCases(caseId) {
  return fetchJson(`/api/cases/${caseId}/group`);
}

export async function getCaseById(caseId) {
  return fetchJson(`/api/cases/${caseId}`);
}

export async function getStudentProfile(enrollmentNo) {
  return fetchJson(`/api/cases/student/${encodeURIComponent(enrollmentNo)}/profile`);
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
  if (Array.isArray(options.caseIds) && options.caseIds.length) {
    // Group incident: one stored file attached to every case.
    formData.append('case_ids', options.caseIds.join(','));
  } else if (options.caseId) {
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

/** A case's evidence files: [{ id, name, file_type, created_at, url }]. Supabase links expire after 10 minutes. */
export async function getCaseEvidence(caseId) {
  return fetchJson(`/api/cases/${caseId}/evidence`);
}

export async function approveCase(caseId) {
  return fetchJson(`/api/cases/${caseId}/approve`, {
    method: 'PUT',
  });
}

/** Admin: schedule an in-person DAC meeting. payload: { scheduled_at (ISO), location, notes }. */
export async function scheduleCaseMeeting(caseId, payload) {
  return fetchJson(`/api/cases/${caseId}/meetings`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Meetings scheduled for one case (newest first). */
export async function getCaseMeetings(caseId) {
  return fetchJson(`/api/cases/${caseId}/meetings`);
}

/** Student: their own DAC meetings (upcoming first). */
export async function getMyMeetings() {
  return fetchJson('/api/cases/meetings/mine');
}

/** AI penalty recommendation for one case (Groq). Advisory only; nothing is saved. */
export async function getCaseRecommendation(caseId, { refresh = false } = {}) {
  const query = refresh ? '?refresh=1' : '';
  return fetchJson(`/api/cases/${caseId}/recommendation${query}`, { method: 'POST' });
}

export async function warnCase(caseId, note = '') {
  return fetchJson(`/api/cases/${caseId}/warn`, {
    method: 'PUT',
    body: JSON.stringify({ note }),
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

function toQueryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

/** One page of cases: { rows, total }. params: page, pageSize, filter, q, role, status. */
export async function getCasesPage(params = {}) {
  return fetchJson(`/api/cases${toQueryString({ page: 0, ...params })}`);
}

/** Dashboard numbers: { total, severe, byStatus, trend: [{ day, count }], queue }. */
export async function getCasesSummary(params = {}) {
  return fetchJson(`/api/cases/summary${toQueryString(params)}`);
}

export async function getCaseHistory(limit = 6) {
  return fetchJson(`/api/cases/history?limit=${encodeURIComponent(limit)}`);
}

export async function getStudentHistory(enrollmentNo, filters = {}) {
  const params = new URLSearchParams();
  if (filters.offenseType) params.set('offense_type', filters.offenseType);
  if (filters.substanceType) params.set('substance_type', filters.substanceType);
  const query = params.toString();
  return fetchJson(`/api/cases/student/${encodeURIComponent(enrollmentNo)}${query ? `?${query}` : ''}`);
}

/** Translates Hindi (or Hinglish) text to English on the backend: { translation }. */
export async function translateHindiToEnglish(text) {
  return fetchJson('/api/translate/hi-en', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function askChatbot(message, conversationId = null) {
  return fetchJson('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message, conversationId }),
  });
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

export async function getMe() {
  return fetchJson('/api/users/me');
}

/** Admin only: sends a test email to EMAIL_TEST_TO (set in the backend .env). */
export async function sendTestEmail() {
  return fetchJson('/api/email/test', { method: 'POST' });
}

export async function getPolicies() {
  return fetchJson('/api/policies');
}

/** Official policies from the signed PDFs: { dac, unfairMeans }. */
export async function getDacPolicy() {
  return fetchJson('/api/policies/dac');
}

/** Admin: adds/corrects the DAC Policy v2 offences as rules. replace=true also deletes other rules. */
export async function loadDacPolicyRules(replace = false) {
  return fetchJson('/api/rules/load-dac-policy', {
    method: 'POST',
    body: JSON.stringify({ replace }),
  });
}
