import {
  createCaseService,
  createGroupCasesService,
  getGroupCasesService,
  MAX_GROUP_STUDENTS,
  getAllCasesService,
  getCasesPageService,
  getCasesSummaryService,
  approveCaseService,
  sendDacPenaltyEmailService,
  warnCaseService,
  getCaseHistoryService,
  getCaseByIdService,
  getStudentProfileService,
  updateCaseService,
  deleteCaseService,
} from '../services/cases.service.js';

// Requester + query filters shared by the case list, page and summary endpoints.
// Returns null when the requested role filter is not allowed.
function readCaseScope(req) {
  const requesterRole = String(req.user?.role || '').toLowerCase();
  const requesterId = Number(req.user?.sub);
  const roleFilter = req.query?.role ? String(req.query.role).toLowerCase() : null;
  const statusFilter = req.query?.status ? String(req.query.status).toLowerCase() : null;

  // Wardens may narrow to the cases they created ("my_created_only").
  const isOwnCasesFilter = requesterRole === 'warden' && roleFilter === 'my_created_only';
  if (roleFilter && requesterRole !== 'admin' && roleFilter !== requesterRole && !isOwnCasesFilter) {
    return null;
  }

  return { requesterRole, requesterId, role: roleFilter, status: statusFilter };
}

export async function getAllCasesController(req, res) {
  try {
    const scope = readCaseScope(req);
    if (!scope) {
      return res.status(403).json({ error: 'Forbidden role filter' });
    }

    // With ?page=N the response is one page: { rows, total }. Without it, the full list.
    if (req.query?.page !== undefined) {
      const result = await getCasesPageService({
        ...scope,
        filter: String(req.query.filter || 'all').toLowerCase(),
        q: req.query.q || '',
        page: Number(req.query.page) || 0,
        pageSize: Number(req.query.pageSize) || 10,
        days: Math.min(Math.max(parseInt(req.query.days, 10) || 0, 0), 3650) || null,
      });
      return res.status(200).json(result);
    }

    const cases = await getAllCasesService(scope);
    return res.status(200).json(cases);
  } catch (error) {
    console.error('Error fetching cases:', error);
    return res.status(500).json({ error: 'Failed to fetch cases' });
  }
}

export async function getCasesSummaryController(req, res) {
  try {
    const scope = readCaseScope(req);
    if (!scope) {
      return res.status(403).json({ error: 'Forbidden role filter' });
    }
    const summary = await getCasesSummaryService(scope);
    return res.status(200).json(summary);
  } catch (error) {
    console.error('Error fetching case summary:', error);
    return res.status(500).json({ error: 'Failed to fetch case summary' });
  }
}

export async function createCaseController(req, res) {
  try {
    const { student_id: studentId, offense_type: offenseType } = req.body;
    const requesterRole = String(req.user?.role || '').toLowerCase();
    const requesterId = Number(req.user?.sub);

    if (!['warden', 'chief_warden'].includes(requesterRole)) {
      return res.status(403).json({ error: 'Only wardens and chief wardens can register cases' });
    }

    if (!studentId || !offenseType) {
      return res.status(400).json({ error: 'student_id and offense_type are required' });
    }

    const createdCase = await createCaseService(req.body, requesterId, requesterRole);
    return res.status(201).json(createdCase);
  } catch (error) {
    if (error?.code === 'INVALID_PENALTY_POINTS') return res.status(400).json({ error: error.message });
    console.error('Error creating case:', error);
    const details = process.env.NODE_ENV === 'production' ? undefined : error?.message;
    return res.status(500).json({ error: 'Failed to create case', details });
  }
}

// POST /api/cases/group { students: [{ student_id, location? }], offense_type, ...shared incident fields }
// Creates one separate case per student, linked by a shared incident_group_id.
export async function createGroupCasesController(req, res) {
  try {
    const requesterRole = String(req.user?.role || '').toLowerCase();
    const requesterId = Number(req.user?.sub);
    const { students, ...shared } = req.body || {};

    if (!Array.isArray(students) || students.length < 2) {
      return res.status(400).json({ error: 'A group incident needs at least 2 students' });
    }
    if (students.length > MAX_GROUP_STUDENTS) {
      return res.status(400).json({ error: `A group incident can have at most ${MAX_GROUP_STUDENTS} students` });
    }
    if (!shared.offense_type) {
      return res.status(400).json({ error: 'offense_type is required' });
    }

    // Students are chosen per case; anything else in the body is shared incident detail.
    delete shared.student_id;
    delete shared.incident_group_id;

    const result = await createGroupCasesService(students, shared, requesterId, requesterRole);
    return res.status(201).json(result);
  } catch (error) {
    if (error?.message === 'INVALID_GROUP') {
      return res.status(400).json({ error: 'Each student must be listed once, with at least 2 students' });
    }
    if (error?.message === 'UNKNOWN_STUDENT') {
      return res.status(400).json({ error: 'One or more selected students were not found' });
    }
    if (error?.code === 'INVALID_PENALTY_POINTS') return res.status(400).json({ error: error.message });
    console.error('Error creating group cases:', error);
    return res.status(500).json({ error: 'Failed to create group cases' });
  }
}

// GET /api/cases/:id/group — the other cases from the same group incident (staff only).
export async function getGroupCasesController(req, res) {
  try {
    const caseId = Number(req.params.id);
    if (!caseId) {
      return res.status(400).json({ error: 'A valid case id is required' });
    }
    return res.status(200).json(await getGroupCasesService(caseId));
  } catch (error) {
    console.error('Error fetching group cases:', error);
    return res.status(500).json({ error: 'Failed to fetch group cases' });
  }
}

export async function getCaseByIdController(req, res) {
  try {
    const caseId = Number(req.params.id);
    if (!caseId) {
      return res.status(400).json({ error: 'A valid case id is required' });
    }

    const caseItem = await getCaseByIdService(caseId);
    // Students may only open their own cases.
    const isOtherStudentsCase = String(req.user?.role || '').toLowerCase() === 'student'
      && Number(caseItem?.student_id) !== Number(req.user?.sub);
    if (!caseItem || isOtherStudentsCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    return res.status(200).json(caseItem);
  } catch (error) {
    console.error('Error fetching case:', error);
    return res.status(500).json({ error: 'Failed to fetch case' });
  }
}

export async function getStudentProfileController(req, res) {
  try {
    const enrollmentNo = String(req.params.enrollmentNo || '').trim();
    if (!enrollmentNo) {
      return res.status(400).json({ error: 'A valid enrollment number is required' });
    }

    const profile = await getStudentProfileService(enrollmentNo);
    if (!profile) {
      return res.status(404).json({ error: 'Student not found' });
    }

    return res.status(200).json(profile);
  } catch (error) {
    console.error('Error fetching student profile:', error);
    return res.status(500).json({ error: 'Failed to fetch student profile' });
  }
}

export async function updateCaseController(req, res) {
  try {
    const caseId = Number(req.params.id);
    if (!caseId) {
      return res.status(400).json({ error: 'A valid case id is required' });
    }

    const actor = {
      id: Number(req.user?.sub),
      role: String(req.user?.role || '').toLowerCase(),
    };

    const current = await getCaseByIdService(caseId);
    if (!current) {
      return res.status(404).json({ error: 'Case not found' });
    }

    if (actor.role !== 'admin') {
      if (actor.role !== 'warden' || Number(current.created_by) !== actor.id) {
        return res.status(403).json({ error: 'Only admin or the case owner can update this case' });
      }

      if (String(current.status || '').toLowerCase() !== 'pending_chief') {
        return res.status(400).json({ error: 'Only pending cases can be updated by the case owner' });
      }
    }

    const updatedCase = await updateCaseService(caseId, req.body || {}, actor);

    return res.status(200).json(updatedCase);
  } catch (error) {
    if (error?.code === 'INVALID_PENALTY_POINTS') return res.status(400).json({ error: error.message });
    console.error('Error updating case:', error);
    return res.status(500).json({ error: 'Failed to update case' });
  }
}

export async function deleteCaseController(req, res) {
  try {
    const caseId = Number(req.params.id);
    if (!caseId) {
      return res.status(400).json({ error: 'A valid case id is required' });
    }

    const deletedCase = await deleteCaseService(caseId);
    if (!deletedCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    return res.status(200).json({ message: 'Case deleted', case: deletedCase });
  } catch (error) {
    // Payment records (case_payments) are kept as history and block deleting the case.
    if (error?.code === '23503' && error?.table === 'case_payments') {
      return res.status(409).json({ error: 'This case has a recorded fine payment and cannot be deleted.' });
    }
    console.error('Error deleting case:', error);
    return res.status(500).json({ error: 'Failed to delete case' });
  }
}

export async function approveCaseController(req, res) {
  try {
    const caseId = Number(req.params.id);
    if (!caseId) {
      return res.status(400).json({ error: 'A valid case id is required' });
    }

    const actor = {
      id: Number(req.user?.sub),
      role: String(req.user?.role || '').toLowerCase(),
    };
    const updatedCase = await approveCaseService(caseId, actor);

    // The Admin's final decision is the only action that emails the student.
    const email = actor.role === 'admin' && updatedCase?.status === 'resolved'
      ? await sendDacPenaltyEmailService(updatedCase.id)
      : undefined;

    return res.status(200).json({
      message: 'Case workflow updated successfully',
      case: updatedCase,
      email,
    });
  } catch (error) {
    if (error?.message === 'CASE_NOT_FOUND') {
      return res.status(404).json({ error: 'Case not found' });
    }
    if (error?.message === 'CASE_ALREADY_RESOLVED') {
      return res.status(400).json({ error: 'Case is already resolved' });
    }
    if (error?.message === 'NOT_ASSIGNED_ROLE' || error?.message === 'FORBIDDEN_ROLE') {
      return res.status(403).json({ error: 'Only the assigned role can approve this case' });
    }
    if (error?.message === 'INVALID_TRANSITION') {
      return res.status(400).json({ error: 'Invalid workflow transition' });
    }

    console.error('Error approving case:', error);
    return res.status(500).json({ error: 'Failed to approve case' });
  }
}

export async function warnCaseController(req, res) {
  try {
    const caseId = Number(req.params.id);
    if (!caseId) {
      return res.status(400).json({ error: 'A valid case id is required' });
    }

    const actor = {
      id: Number(req.user?.sub),
      role: String(req.user?.role || '').toLowerCase(),
    };
    const updatedCase = await warnCaseService(caseId, actor, req.body?.note);
    return res.status(200).json({
      message: 'Case resolved with a warning',
      case: updatedCase,
    });
  } catch (error) {
    if (error?.message === 'CASE_NOT_FOUND') {
      return res.status(404).json({ error: 'Case not found' });
    }
    if (error?.message === 'CASE_ALREADY_RESOLVED') {
      return res.status(400).json({ error: 'Case is already resolved' });
    }
    if (error?.message === 'NOT_ASSIGNED_ROLE' || error?.message === 'FORBIDDEN_ROLE') {
      return res.status(403).json({ error: 'Only the assigned role can resolve this case' });
    }

    console.error('Error resolving case with warning:', error);
    return res.status(500).json({ error: 'Failed to resolve case with warning' });
  }
}

export async function getCaseHistoryController(req, res) {
  try {
    const requesterRole = String(req.user?.role || '').toLowerCase();
    const requesterId = Number(req.user?.sub);
    const limit = Number(req.query?.limit) || 6;

    const history = await getCaseHistoryService({
      requesterRole,
      requesterId,
      limit,
    });

    res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching case history:', error);
    res.status(500).json({ error: 'Failed to fetch case history' });
  }
}
