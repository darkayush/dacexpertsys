import { Router } from 'express';
import pool from '../config/db.js';
import { DAC_POLICY, OFFENCE_TYPES, UNFAIR_MEANS_POLICY } from '../config/dacPolicy.js';

const router = Router();

// Official DAC policy sections (the policy documents in the RAG knowledge base).
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, content, metadata
       FROM rag_documents
       WHERE document_type = 'dac_policy'
       ORDER BY id`
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching policies:', error);
    return res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

// Structured official policies (DAC Policy v2 + Unfair Means Policy) for the student policy page,
// plus the offence types used by Register Case and the Rules & Policies editor.
router.get('/dac', (req, res) => {
  res.status(200).json({ dac: DAC_POLICY, unfairMeans: UNFAIR_MEANS_POLICY, offenceTypes: OFFENCE_TYPES });
});

export default router;
