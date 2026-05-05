import {
  createEvidenceService,
  getEvidenceByIdService,
  getEvidenceService,
  updateEvidenceService,
  deleteEvidenceService,
  attachEvidenceToCaseService,
} from '../services/evidence.service.js';
import { getCaseByIdService } from '../services/cases.service.js';

export async function getEvidenceController(req, res) {
  try {
    const caseId = req.query?.case_id ? Number(req.query.case_id) : null;
    const evidence = await getEvidenceService({ caseId });
    return res.status(200).json(evidence);
  } catch (error) {
    console.error('Error fetching evidence:', error);
    return res.status(500).json({ error: 'Failed to fetch evidence' });
  }
}

export async function getEvidenceByIdController(req, res) {
  try {
    const evidenceId = Number(req.params.id);
    if (!evidenceId) {
      return res.status(400).json({ error: 'A valid evidence id is required' });
    }

    const evidence = await getEvidenceByIdService(evidenceId);
    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    return res.status(200).json(evidence);
  } catch (error) {
    console.error('Error fetching evidence:', error);
    return res.status(500).json({ error: 'Failed to fetch evidence' });
  }
}

export async function uploadEvidenceController(req, res) {
  try {
    const caseId = Number(req.body?.case_id || req.query?.case_id);
    if (!caseId) {
      return res.status(400).json({ error: 'case_id is required' });
    }

    const existingCase = await getCaseByIdService(caseId);
    if (!existingCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Evidence file is required' });
    }

    const fileUrl = `/uploads/evidence/${req.file.filename}`;
    const evidence = await createEvidenceService({
      caseId,
      fileUrl,
      fileType: req.file.mimetype,
      uploadedBy: Number(req.user?.sub) || null,
    });

    await attachEvidenceToCaseService(caseId, fileUrl);

    return res.status(201).json({
      evidence,
      fileUrl,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    console.error('Evidence upload error:', error);
    return res.status(500).json({ error: 'Failed to upload evidence' });
  }
}

export async function updateEvidenceController(req, res) {
  try {
    const evidenceId = Number(req.params.id);
    if (!evidenceId) {
      return res.status(400).json({ error: 'A valid evidence id is required' });
    }

    const updated = await updateEvidenceService(evidenceId, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Error updating evidence:', error);
    return res.status(500).json({ error: 'Failed to update evidence' });
  }
}

export async function deleteEvidenceController(req, res) {
  try {
    const evidenceId = Number(req.params.id);
    if (!evidenceId) {
      return res.status(400).json({ error: 'A valid evidence id is required' });
    }

    const deleted = await deleteEvidenceService(evidenceId);
    if (!deleted) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    return res.status(200).json({ message: 'Evidence deleted', evidence: deleted });
  } catch (error) {
    console.error('Error deleting evidence:', error);
    return res.status(500).json({ error: 'Failed to delete evidence' });
  }
}
