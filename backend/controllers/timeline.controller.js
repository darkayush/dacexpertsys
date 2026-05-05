import {
  createCaseTimelineService,
  getCaseTimelineService,
  updateCaseTimelineService,
  deleteCaseTimelineService,
} from '../services/timeline.service.js';

export async function getCaseTimelineController(req, res) {
  try {
    const caseId = Number(req.params.id);
    if (!caseId) {
      return res.status(400).json({ error: 'A valid case id is required' });
    }

    const timeline = await getCaseTimelineService(caseId);
    return res.status(200).json(timeline);
  } catch (error) {
    console.error('Error fetching case timeline:', error);
    return res.status(500).json({ error: 'Failed to fetch case timeline' });
  }
}

export async function createCaseTimelineController(req, res) {
  try {
    const caseId = Number(req.params.id);
    const { event } = req.body || {};
    if (!caseId || !event) {
      return res.status(400).json({ error: 'case id and event are required' });
    }

    const created = await createCaseTimelineService({
      caseId,
      event,
      performedBy: Number(req.user?.sub) || null,
    });

    return res.status(201).json(created);
  } catch (error) {
    console.error('Error creating case timeline:', error);
    return res.status(500).json({ error: 'Failed to create case timeline' });
  }
}

export async function updateCaseTimelineController(req, res) {
  try {
    const timelineId = Number(req.params.timelineId);
    if (!timelineId) {
      return res.status(400).json({ error: 'A valid timeline id is required' });
    }

    const updated = await updateCaseTimelineService(timelineId, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: 'Timeline entry not found' });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Error updating case timeline:', error);
    return res.status(500).json({ error: 'Failed to update case timeline' });
  }
}

export async function deleteCaseTimelineController(req, res) {
  try {
    const timelineId = Number(req.params.timelineId);
    if (!timelineId) {
      return res.status(400).json({ error: 'A valid timeline id is required' });
    }

    const deleted = await deleteCaseTimelineService(timelineId);
    if (!deleted) {
      return res.status(404).json({ error: 'Timeline entry not found' });
    }

    return res.status(200).json({ message: 'Timeline entry deleted', entry: deleted });
  } catch (error) {
    console.error('Error deleting case timeline:', error);
    return res.status(500).json({ error: 'Failed to delete case timeline' });
  }
}
