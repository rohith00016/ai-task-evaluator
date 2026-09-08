import { formatPRDDocumentation, generatePRDDeliverables, generatePRDCriteria } from '../services/geminiService.js';

/**
 * Format raw PRD notes with Gemini AI while strictly preserving context.
 */
export async function formatPRD(req, res) {
  try {
    const { rawMarkdown } = req.body;
    if (!rawMarkdown || !rawMarkdown.trim()) {
      return res.status(400).json({ error: 'rawMarkdown content is required' });
    }

    const result = await formatPRDDocumentation(rawMarkdown);
    res.json(result);
  } catch (err) {
    console.error('[AIController] PRD formatting error:', err);
    res.status(500).json({ error: 'AI PRD formatting failed', details: err.message });
  }
}

/**
 * Generate concrete, non-random deliverables directly from PRD markdown.
 */
export async function generateDeliverables(req, res) {
  try {
    const { prdMarkdown, projectTitle = 'Project' } = req.body;
    if (!prdMarkdown || !prdMarkdown.trim()) {
      return res.status(400).json({ error: 'prdMarkdown content is required' });
    }

    const deliverables = await generatePRDDeliverables(prdMarkdown, projectTitle);
    res.json({ deliverables });
  } catch (err) {
    console.error('[AIController] Deliverables generation error:', err);
    res.status(500).json({ error: 'Deliverables generation failed', details: err.message });
  }
}

/**
 * Generate tailored evaluation criteria pillars directly from PRD markdown and deliverables.
 */
export async function generateCriteria(req, res) {
  try {
    const { prdMarkdown, deliverables = [], projectTitle = 'Project' } = req.body;
    if (!prdMarkdown || !prdMarkdown.trim()) {
      return res.status(400).json({ error: 'prdMarkdown content is required' });
    }

    const criteria = await generatePRDCriteria(prdMarkdown, deliverables, projectTitle);
    res.json({ criteria });
  } catch (err) {
    console.error('[AIController] Criteria generation error:', err);
    res.status(500).json({ error: 'Criteria generation failed', details: err.message });
  }
}
