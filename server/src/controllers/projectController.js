import Project from '../models/Project.js';
import Submission from '../models/Submission.js';

/**
 * List all projects.
 */
export async function getAllProjects(req, res) {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    console.error('[ProjectController] Error fetching projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects', details: err.message });
  }
}

/**
 * Get a single project by ID.
 */
export async function getProjectById(req, res) {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (err) {
    console.error('[ProjectController] Error fetching project:', err);
    res.status(500).json({ error: 'Failed to fetch project', details: err.message });
  }
}

/**
 * Create a new evaluation project.
 */
export async function createProject(req, res) {
  try {
    const {
      title,
      description,
      course,
      category,
      requirements,
      documentation,
      criteria,
      rawMarkdown
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Project title is required' });
    }

    const prdMarkdown = (typeof documentation === 'string'
      ? documentation
      : (documentation?.rawMarkdown || rawMarkdown || '')
    ).trim();

    let autoDescription = description;
    if (!autoDescription && prdMarkdown) {
      const summaryParagraph = prdMarkdown
        .split('\n\n')
        .find((p) => !p.startsWith('#') && p.length > 20);
      autoDescription = summaryParagraph
        ? summaryParagraph.replace(/[*_`#]/g, '').trim().slice(0, 160)
        : title.trim();
    }

    const projectCourse = (course === 'JFSD' || category === 'JFSD') ? 'JFSD' : 'MERN';

    const newProject = new Project({
      title: title.trim(),
      description: autoDescription || title.trim(),
      course: projectCourse,
      requirements: Array.isArray(requirements) ? requirements : [],
      criteria: Array.isArray(criteria) && criteria.length > 0 ? criteria : undefined,
      documentation: { rawMarkdown: prdMarkdown }
    });

    const saved = await newProject.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('[ProjectController] Error creating project:', err);
    res.status(500).json({ error: 'Failed to create project', details: err.message });
  }
}

/**
 * Update project documentation, deliverables, or criteria.
 */
export async function updateProject(req, res) {
  try {
    const {
      title,
      description,
      course,
      category,
      requirements,
      documentation,
      criteria,
      rawMarkdown
    } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (title !== undefined) project.title = title.trim();
    if (description !== undefined) project.description = description;
    if (course !== undefined) {
      project.course = course === 'JFSD' ? 'JFSD' : 'MERN';
    } else if (category !== undefined) {
      project.course = category === 'JFSD' ? 'JFSD' : 'MERN';
    }
    if (requirements !== undefined) {
      project.requirements = Array.isArray(requirements) ? requirements : [];
    }
    if (criteria !== undefined) {
      project.criteria = Array.isArray(criteria) ? criteria : [];
    }
    if (documentation !== undefined || rawMarkdown !== undefined) {
      const docMarkdown = typeof documentation === 'string'
        ? documentation
        : (documentation?.rawMarkdown || rawMarkdown || '');
      project.documentation = { rawMarkdown: docMarkdown };
      project.markModified('documentation');
    }

    const updated = await project.save();
    res.json(updated);
  } catch (err) {
    console.error('[ProjectController] Error updating project:', err);
    res.status(500).json({ error: 'Failed to update project', details: err.message });
  }
}

/**
 * Delete a project and cascade delete its submissions.
 */
export async function deleteProject(req, res) {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Delete associated submissions
    await Submission.deleteMany({ projectId: req.params.id });

    res.json({ message: 'Project and associated submissions deleted successfully', id: req.params.id });
  } catch (err) {
    console.error('[ProjectController] Error deleting project:', err);
    res.status(500).json({ error: 'Failed to delete project', details: err.message });
  }
}
