/**
 * Central API client for interacting with the Node.js Express & MongoDB backend.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');


async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  const token = localStorage.getItem('evaluator_token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  const res = await fetch(url, config);

  if (!res.ok) {
    let errorDetail = res.statusText;
    let errorType = null;
    let errorHint = null;
    try {
      const errorData = await res.json();
      if (errorData?.error) {
        errorDetail = errorData.error;
      }
      errorType = errorData?.errorType || null;
      errorHint = errorData?.hint || null;
    } catch {
      // ignore
    }

    if (res.status === 401 && !endpoint.startsWith('/auth/login') && !endpoint.startsWith('/auth/register')) {
      localStorage.removeItem('evaluator_token');
      localStorage.removeItem('evaluator_user');
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    const err = new Error(errorDetail);
    err.status = res.status;
    err.errorType = errorType;
    err.hint = errorHint;
    throw err;
  }

  return res.json();
}

/* ===========================
 * Project Endpoints
 * =========================== */

export async function fetchProjects() {
  const projects = await request('/projects');
  return projects.map(normalizeProject);
}

export async function fetchProjectById(id) {
  const project = await request(`/projects/${id}`);
  return normalizeProject(project);
}

export async function createProject(projectData) {
  const project = await request('/projects', {
    method: 'POST',
    body: JSON.stringify(projectData)
  });
  return normalizeProject(project);
}

export async function updateProject(id, updates) {
  const project = await request(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
  return normalizeProject(project);
}

export async function deleteProject(id) {
  return request(`/projects/${id}`, {
    method: 'DELETE'
  });
}

/* ===========================
 * Submission Endpoints
 * =========================== */

export async function fetchSubmissions(projectId = null) {
  const endpoint = projectId ? `/submissions?projectId=${encodeURIComponent(projectId)}` : '/submissions';
  const submissions = await request(endpoint);
  return submissions.map(normalizeSubmission);
}

export async function fetchSubmissionById(id) {
  const submission = await request(`/submissions/${id}`);
  return normalizeSubmission(submission);
}

export async function submitAndEvaluate(submissionData) {
  const submission = await request('/submissions/evaluate', {
    method: 'POST',
    body: JSON.stringify(submissionData)
  });
  return normalizeSubmission(submission);
}

export async function reevaluateSubmission(id) {
  const submission = await request(`/submissions/${id}/reevaluate`, {
    method: 'POST'
  });
  return normalizeSubmission(submission);
}

/* ===========================
 * AI Utility Endpoints
 * =========================== */

export async function formatDocumentationWithAI(rawMarkdown) {
  return request('/ai/format-prd', {
    method: 'POST',
    body: JSON.stringify({ rawMarkdown })
  });
}

export async function generateDeliverablesFromPRD(prdMarkdown, projectTitle = 'Project') {
  const result = await request('/ai/generate-deliverables', {
    method: 'POST',
    body: JSON.stringify({ prdMarkdown, projectTitle })
  });
  return result.deliverables || [];
}

export async function generateCriteriaFromPRD(prdMarkdown, deliverables = [], projectTitle = 'Project') {
  const result = await request('/ai/generate-criteria', {
    method: 'POST',
    body: JSON.stringify({ prdMarkdown, deliverables, projectTitle })
  });
  return result.criteria || [];
}

/* ===========================
 * Helper Normalizers
 * =========================== */

function normalizeProject(p) {
  if (!p) return null;
  const rawMarkdown = typeof p.documentation === 'string'
    ? p.documentation
    : (p.documentation?.rawMarkdown || p.rawMarkdown || '');
  return {
    ...p,
    id: p._id || p.id,
    requirements: p.requirements || [],
    criteria: p.criteria || [],
    requirementsCount: p.requirements?.length || 0,
    evaluationCriteriaCount: p.criteria?.length || 0,
    documentation: {
      rawMarkdown
    }
  };
}

function normalizeSubmission(s) {
  if (!s) return null;
  return {
    ...s,
    id: s._id || s.id
  };
}

/**
 * Converts a project's documentation object into clean, formatted GitHub Markdown.
 */
export function getProjectPRDMarkdown(project) {
  if (!project) return '';
  if (typeof project.documentation === 'string' && project.documentation.trim()) {
    return project.documentation;
  }
  if (project.documentation?.rawMarkdown) {
    return project.documentation.rawMarkdown;
  }
  if (project.rawMarkdown) {
    return project.rawMarkdown;
  }
  return `# ${project.title}\n\n## Problem Statement & Scope\n${project.description || 'No documentation provided.'}`;
}

/* ===========================
 * Auth Endpoints
 * =========================== */

export async function loginUser(credentials) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  });
}

export async function registerUser(userData) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
}

export async function fetchCurrentUser() {
  return request('/auth/me');
}
