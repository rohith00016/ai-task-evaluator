import Submission from '../models/Submission.js';
import Project from '../models/Project.js';
import { fetchRepositoryCode } from '../services/githubService.js';
import { evaluateRepositoryCode } from '../services/geminiService.js';

/**
 * List all submissions, optionally filtered by projectId.
 */
export async function getAllSubmissions(req, res) {
  try {
    const filter = {};
    if (req.query.projectId) {
      filter.projectId = req.query.projectId;
    }

    // Role-based scoping: Learners only see their own submissions
    if (req.user && req.user.role === 'learner') {
      filter.userId = req.user.id;
    }

    const submissions = await Submission.find(filter)
      .select('-evaluation.scrapedFiles')
      .sort({ submittedAt: -1 });
    res.json(submissions);
  } catch (err) {
    console.error('[SubmissionController] Error fetching submissions:', err);
    res.status(500).json({ error: 'Failed to fetch submissions', details: err.message });
  }
}

/**
 * Get a single submission by ID.
 */
export async function getSubmissionById(req, res) {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Learners can only access their own submissions
    if (req.user && req.user.role === 'learner' && submission.userId && submission.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this submission evaluation' });
    }

    res.json(submission);
  } catch (err) {
    console.error('[SubmissionController] Error fetching submission:', err);
    res.status(500).json({ error: 'Failed to fetch submission', details: err.message });
  }
}

/**
 * Evaluates a submitted GitHub repository by inspecting real source files and running Gemini 2.5 Flash.
 */
export async function evaluateSubmission(req, res) {
  try {
    const { projectId, repoUrl, branch = 'main', notes = '' } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }
    if (!repoUrl || !repoUrl.trim()) {
      return res.status(400).json({ error: 'GitHub repository URL is required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found for submission' });
    }

    console.log(`[SubmissionController] Starting evaluation for project "${project.title}" with repo: ${repoUrl}`);

    // 1. Fetch real source code from GitHub
    const repoData = await fetchRepositoryCode(repoUrl.trim(), branch.trim() || 'main');

    if (repoData.error) {
      console.warn(`[SubmissionController] Repository validation rejected for "${repoUrl}": ${repoData.error}`);
      return res.status(422).json({
        error: repoData.error,
        errorType: repoData.errorType,
        hint: repoData.hint
      });
    }

    // 2. Perform AI evaluation using Gemini 2.5 Flash with real code files
    const evaluation = await evaluateRepositoryCode(project, repoData, {
      repoUrl: repoUrl.trim(),
      branch: branch.trim() || 'main',
      notes: notes.trim()
    });

    // Attach scraped files for in-app code inspector verification
    evaluation.scrapedFiles = (repoData.files || []).map((f) => ({
      path: f.path,
      lineCount: f.lineCount,
      size: f.size,
      sizeBytes: f.size,
      content: f.content
    }));

    const status = evaluation.score >= 75 ? 'passed' : evaluation.score >= 50 ? 'review' : 'failed';

    // 3. Save to MongoDB
    const newSubmission = new Submission({
      projectId: project.id,
      userId: req.user?.id || null,
      userEmail: req.user?.email || '',
      userName: req.user?.name || '',
      projectTitle: project.title,
      repoUrl: repoUrl.trim(),
      branch: branch.trim() || 'main',
      notes: notes.trim(),
      submittedAt: new Date(),
      score: evaluation.score,
      status,
      evaluation
    });

    const saved = await newSubmission.save();
    console.log(`[SubmissionController] Evaluation complete for "${project.title}". Score: ${saved.score}/100. ID: ${saved.id}`);

    res.status(201).json(saved);
  } catch (err) {
    console.error('[SubmissionController] Evaluation failed:', err);
    res.status(500).json({ error: 'Code evaluation failed', details: err.message });
  }
}

/**
 * Re-evaluates an existing submission.
 */
export async function reevaluateSubmission(req, res) {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Learners can only re-evaluate their own submissions
    if (req.user && req.user.role === 'learner' && submission.userId && submission.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. You can only re-evaluate your own submissions.' });
    }

    const project = await Project.findById(submission.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Associated project not found' });
    }

    console.log(`[SubmissionController] Re-evaluating submission ${submission.id} for repo: ${submission.repoUrl}`);

    const repoData = await fetchRepositoryCode(submission.repoUrl, submission.branch || 'main');

    if (repoData.error) {
      console.warn(`[SubmissionController] Repository validation rejected on re-evaluate for "${submission.repoUrl}": ${repoData.error}`);
      return res.status(422).json({
        error: repoData.error,
        errorType: repoData.errorType,
        hint: repoData.hint
      });
    }

    const evaluation = await evaluateRepositoryCode(project, repoData, {
      repoUrl: submission.repoUrl,
      branch: submission.branch || 'main',
      notes: submission.notes || ''
    });

    evaluation.scrapedFiles = (repoData.files || []).map((f) => ({
      path: f.path,
      lineCount: f.lineCount,
      size: f.size,
      sizeBytes: f.size,
      content: f.content
    }));

    submission.score = evaluation.score;
    submission.status = evaluation.score >= 75 ? 'passed' : evaluation.score >= 50 ? 'review' : 'failed';
    submission.evaluation = evaluation;
    submission.submittedAt = new Date();

    const updated = await submission.save();
    res.json(updated);
  } catch (err) {
    console.error('[SubmissionController] Re-evaluation failed:', err);
    res.status(500).json({ error: 'Re-evaluation failed', details: err.message });
  }
}
