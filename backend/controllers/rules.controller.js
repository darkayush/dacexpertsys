import {
  getRulesService,
  createRuleService,
  updateRuleService,
  deleteRuleService,
  loadDacPolicyRulesService,
} from '../services/rules.service.js';
import { OFFENCE_TYPES } from '../config/dacPolicy.js';

// A rule's offence_type must be one of the Register Case offence types (empty = none).
// "Other" has no rule list: the warden types the offence.
function invalidOffenceType(value) {
  if (value === undefined || value === null || value === '') return false;
  return value === 'Other' || !OFFENCE_TYPES.includes(value);
}
const OFFENCE_TYPE_ERROR = `offence_type must be one of: ${OFFENCE_TYPES.filter((t) => t !== 'Other').join(', ')}`;

export async function getRulesController(req, res) {
  try {
    const rules = await getRulesService();
    return res.status(200).json(rules);
  } catch (error) {
    console.error('Error fetching rules:', error);
    return res.status(500).json({ error: 'Failed to fetch rules' });
  }
}

export async function createRuleController(req, res) {
  try {
    const { question, weight, category, offence_type: offenceType } = req.body || {};
    if (!question || weight === undefined || weight === null) {
      return res.status(400).json({ error: 'question and weight are required' });
    }
    if (invalidOffenceType(offenceType)) {
      return res.status(400).json({ error: OFFENCE_TYPE_ERROR });
    }

    const created = await createRuleService({ question, weight, category, offence_type: offenceType });
    return res.status(201).json(created);
  } catch (error) {
    console.error('Error creating rule:', error);
    return res.status(500).json({ error: 'Failed to create rule' });
  }
}

export async function updateRuleController(req, res) {
  try {
    const ruleId = Number(req.params.id);
    if (!ruleId) {
      return res.status(400).json({ error: 'A valid rule id is required' });
    }
    if (invalidOffenceType(req.body?.offence_type)) {
      return res.status(400).json({ error: OFFENCE_TYPE_ERROR });
    }

    const updated = await updateRuleService(ruleId, req.body || {});
    if (!updated) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error('Error updating rule:', error);
    return res.status(500).json({ error: 'Failed to update rule' });
  }
}

export async function deleteRuleController(req, res) {
  try {
    const ruleId = Number(req.params.id);
    if (!ruleId) {
      return res.status(400).json({ error: 'A valid rule id is required' });
    }

    const deleted = await deleteRuleService(ruleId);
    if (!deleted) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    return res.status(200).json({ message: 'Rule deleted', rule: deleted });
  } catch (error) {
    console.error('Error deleting rule:', error);
    return res.status(500).json({ error: 'Failed to delete rule' });
  }
}

export async function loadDacPolicyRulesController(req, res) {
  try {
    const result = await loadDacPolicyRulesService({ replace: Boolean(req.body?.replace) });
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error loading DAC policy rules:', error);
    return res.status(500).json({ error: 'Failed to load DAC policy rules' });
  }
}
