import {
  getRulesService,
  createRuleService,
  updateRuleService,
  deleteRuleService,
  seedRulesService,
} from '../services/rules.service.js';

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
    const { question, weight, category } = req.body || {};
    if (!question || weight === undefined || weight === null) {
      return res.status(400).json({ error: 'question and weight are required' });
    }

    const created = await createRuleService({ question, weight, category });
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

export async function seedRulesController(req, res) {
  try {
    const { rules, force } = req.body || {};
    if (!Array.isArray(rules)) {
      return res.status(400).json({ error: 'rules array is required' });
    }

    const result = await seedRulesService(rules, { force: Boolean(force) });
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error seeding rules:', error);
    return res.status(500).json({ error: 'Failed to seed rules' });
  }
}
