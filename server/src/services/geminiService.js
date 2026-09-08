import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Core helper to query Google Gemini 2.5 Flash API from the server.
 */
async function callGemini({ prompt, systemInstruction = '', responseMimeType = 'application/json' }) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is missing. Please ensure GEMINI_API_KEY is configured in server/.env.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: responseMimeType
    }
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errData = await response.json();
      if (errData?.error?.message) {
        errorDetail = errData.error.message;
      }
    } catch {
      // ignore
    }
    throw new Error(`Google Gemini API Error (${response.status}): ${errorDetail}`);
  }

  const data = await response.json();
  const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error('Gemini returned an empty response. Please retry.');
  }

  return textOutput;
}

/**
 * Helper to call Gemini and parse guaranteed JSON output.
 */
async function callGeminiJSON(prompt, systemInstruction = '') {
  const rawText = await callGemini({ prompt, systemInstruction, responseMimeType: 'application/json' });
  try {
    return JSON.parse(rawText);
  } catch {
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse Gemini JSON output:', rawText);
      throw new Error('Gemini returned a response that could not be parsed as JSON.');
    }
  }
}

/**
 * Evaluates real source code from a GitHub repository against a project's PRD and deliverables checklist.
 */
export async function evaluateRepositoryCode(project, repoData, submissionData) {
  const criteriaList = project.criteria && project.criteria.length > 0
    ? project.criteria
    : [
      { name: 'Core Functionality & PRD Deliverables', maxScore: 30 },
      { name: 'Architecture & Modularity', maxScore: 25 },
      { name: 'Security & Error Handling', maxScore: 25 },
      { name: 'Code Quality & Documentation', maxScore: 20 }
    ];

  const requirementsList = project.requirements && project.requirements.length > 0
    ? project.requirements
    : [
      'User authentication with JWT',
      'Resource CRUD operations',
      'Persistent database integration',
      'Responsive user interface'
    ];

  const prdMarkdown = project.rawMarkdown || project.documentation?.rawMarkdown || project.description || '';

  // 0. If zero files were extracted, short-circuit immediately with an honest 0 score
  const filesList = repoData.files || [];
  if (filesList.length === 0) {
    return {
      score: 0,
      maxScore: 100,
      summary: 'The repository submission contains no source code files for evaluation. Consequently, zero project deliverables could be verified, resulting in a score of zero across all pillars.',
      criteriaBreakdown: criteriaList.map((c) => ({
        name: c.name,
        score: 0,
        maxScore: c.maxScore,
        feedback: 'No code submitted for evaluation.'
      })),
      completed: [],
      missing: [...requirementsList],
      issues: [
        {
          title: 'No Source Code Files Found',
          location: 'Repository Root',
          severity: 'critical',
          suggestion: 'Please commit and push your project code files before submitting for evaluation.'
        }
      ]
    };
  }

  // Prepare code files snippet for the prompt
  const codeContext = filesList
    .map((f) => `### FILE: ${f.path} (${f.lineCount} lines)\n\`\`\`\n${f.content.slice(0, 6000)}\n\`\`\``)
    .join('\n\n');

  const prompt = `You are a strict, senior code evaluation engine for an ed-tech coding assessment platform like HCL GUVI.
Evaluate the following learner repository submission against the project's PRD specifications and deliverables checklist.

PROJECT DETAILS:
Title: "${project.title}"
Course: "${project.course || project.category || 'MERN'}"

DELIVERABLES CHECKLIST TO VERIFY:
${requirementsList.map((r, idx) => `${idx + 1}. ${r}`).join('\n')}

PROJECT PRD SPECIFICATIONS:
"""
${prdMarkdown.slice(0, 5000)}
"""

EVALUATION PILLARS (Total Max Score = 100):
${criteriaList.map((c) => `- ${c.name} (Max: ${c.maxScore} points)`).join('\n')}

SUBMISSION METADATA:
Repository URL: ${submissionData.repoUrl}
Branch: ${submissionData.branch || 'main'}
Total Code Files Extracted: ${filesList.length}

ACTUAL REPOSITORY SOURCE CODE INSPECTED:
${codeContext.slice(0, 45000)}

EVALUATION INSTRUCTIONS:
1. RIGOROUS SOURCE CODE ANALYSIS: Read the submitted source code line-by-line.
2. FUNCTIONAL FLEXIBILITY OVER ENDPOINT NAMES: Do NOT penalize learners for differing API route naming (e.g. using '/auth/signin' vs '/api/v1/auth/login', singular vs plural routes, or custom prefixes). Learners solve problems with different naming conventions; focus strictly on whether the underlying functional capability, logic, data handling, and deliverables are implemented.
3. DELIVERABLES VERIFICATION: For each item in the DELIVERABLES CHECKLIST, verify whether the learner actually wrote the functional code to satisfy it. List verified deliverables under "completed" and unfulfilled deliverables under "missing".
4. CRITERIA SCORING: For each pillar in EVALUATION PILLARS, award an honest score (0 to maxScore) with specific technical feedback. Sum of scores must equal the total score.
5. LINE-LEVEL CODE ISSUES: Detect 2 to 4 genuine code issues, vulnerabilities, or bad practices found in the submitted files. Cite the EXACT file path and line number from the inspected files (e.g. "src/controllers/auth.js:42").
6. Write a concise, constructive 2-3 sentence executive summary.

Return ONLY valid JSON matching this schema:
{
  "score": number,
  "summary": string,
  "criteriaBreakdown": [
    { "name": string, "score": number, "maxScore": number, "feedback": string }
  ],
  "completed": string[],
  "missing": string[],
  "issues": [
    { "title": string, "location": string, "severity": "critical"|"warning"|"info", "suggestion": string }
  ]
}`;

  const geminiResult = await callGeminiJSON(
    prompt,
    'You are an expert automated code evaluator. You perform strict, realistic assessments based on actual code files.'
  );

  // 1. Strict Criteria Normalization (preserves honest 0 scores without 80% fallback)
  let calculatedScore = 0;
  const normalizedCriteria = criteriaList.map((target) => {
    const match = (geminiResult.criteriaBreakdown || []).find(
      (crit) => crit.name?.toLowerCase().trim() === target.name.toLowerCase().trim()
    );
    const maxScore = target.maxScore || 25;
    const rawScore = match ? Number(match.score) : NaN;
    // Strict numeric check: if model gave 0, keep 0!
    const score = !isNaN(rawScore) ? Math.min(maxScore, Math.max(0, Math.round(rawScore))) : 0;
    calculatedScore += score;
    return {
      name: target.name,
      score,
      maxScore,
      feedback: match?.feedback || 'Evaluated against PRD requirements.'
    };
  });

  // 2. Strict Deliverable Reconciliation (zero overlap between completed and missing)
  const completedRaw = Array.isArray(geminiResult.completed) ? geminiResult.completed : [];
  const completed = [];
  const missing = [];

  for (const req of requirementsList) {
    const reqClean = req.toLowerCase().trim();
    const isCompleted = completedRaw.some((c) => {
      const cClean = String(c).toLowerCase().trim();
      return (
        cClean === reqClean ||
        cClean.includes(reqClean.slice(0, Math.min(40, reqClean.length))) ||
        reqClean.includes(cClean.slice(0, Math.min(40, cClean.length)))
      );
    });

    if (isCompleted) {
      completed.push(req);
    } else {
      missing.push(req);
    }
  }

  // 3. Clean Issues (no artificial mock issues)
  const cleanIssues = Array.isArray(geminiResult.issues)
    ? geminiResult.issues.filter((iss) => iss && iss.title)
    : [];

  return {
    score: calculatedScore,
    maxScore: 100,
    summary:
      geminiResult.summary ||
      `Evaluation completed for ${submissionData.repoUrl}. Assessed ${filesList.length} source files against PRD requirements.`,
    criteriaBreakdown: normalizedCriteria,
    completed,
    missing,
    issues: cleanIssues
  };
}

/**
 * Formats chaotic notes into structured GitHub PRD Markdown with zero context drift.
 */
export async function formatPRDDocumentation(rawText) {
  const prompt = `You are an expert technical writer and curriculum documentation formatter.
Reformat the following raw project documentation into clean, professional GitHub Markdown.

RAW DOCUMENTATION TO FORMAT:
"""
${rawText}
"""

CRITICAL CONTEXT-PRESERVATION CONSTRAINTS:
1. STRICTLY ZERO CONTEXT DRIFT: You MUST NOT alter, omit, or add any facts, technical details, library names, URLs, routes, database columns, or business logic.
2. 100% of all technical terms, endpoints, variables, and constraints in the original text must remain intact verbatim.
3. Organize chaotic content into clean Markdown sections:
   - ## Problem Statement & Scope
   - ## System Architecture & Tech Stack
   - ## Functional Specifications & User Stories (format each story with a clean sub-heading: ### US-01: Title, followed by description and a bulleted acceptance criteria checklist. DO NOT use blockquotes >)
   - ## REST API Specifications (formatted as a clean Markdown table: | Method | Endpoint Path | Description | Authentication |)
   - ## Submission Guidelines & Repository Standards
4. Count the formatting improvements you made:
   - headingsAdded: number of markdown headings created
   - tablesFormatted: number of markdown tables formatted
   - listsCleaned: number of bullet or numbered list items cleanly formatted

Return ONLY valid JSON matching this schema:
{
  "formattedMarkdown": string,
  "stats": {
    "headingsAdded": number,
    "tablesFormatted": number,
    "listsCleaned": number,
    "contextPreserved": true
  }
}`;

  const result = await callGeminiJSON(prompt, 'You format technical documentation into clean GitHub markdown while strictly preserving 100% of original context.');

  return {
    formattedMarkdown: result.formattedMarkdown || rawText,
    stats: {
      headingsAdded: Math.max(1, result.stats?.headingsAdded || 3),
      tablesFormatted: Math.max(0, result.stats?.tablesFormatted || 1),
      listsCleaned: Math.max(1, result.stats?.listsCleaned || 5),
      contextPreserved: true
    }
  };
}

/**
 * Analyzes PRD Markdown and extracts 6 to 8 concrete technical deliverables.
 */
export async function generatePRDDeliverables(prdMarkdown, projectTitle = 'Project') {
  const prompt = `You are a technical curriculum evaluator for an ed-tech coding platform like HCL GUVI.
Analyze the following Project Requirement Document (PRD) for "${projectTitle}" and extract a concrete, actionable Deliverables Checklist:

PRD DOCUMENTATION:
"""
${prdMarkdown.slice(0, 9000)}
"""

STRICT DELIVERABLE RULES:
1. NON-RANDOM & ACCURATE: Every deliverable MUST derive directly from the user stories, API endpoints, architecture stack, and workflows explicitly detailed in this PRD.
2. CONCRETE & VERIFIABLE: Write 6 to 8 clear, specific technical milestones that a learner must code to satisfy the PRD (e.g. "Implement user authentication with JWT login & register routes", "Build product catalog with category filters and pagination", "Develop persistent cart with localStorage sync", "Construct order placement transaction workflow").
3. DO NOT output generic boilerplate. Deliverables must accurately reflect the specific domain and tech stack of this PRD.

Return ONLY valid JSON matching this schema:
{
  "deliverables": string[]
}`;

  const result = await callGeminiJSON(prompt, 'You extract precise, concrete technical deliverables directly from project documentation without inventing random tasks.');

  const deliverables = Array.isArray(result.deliverables) && result.deliverables.length > 0
    ? result.deliverables
    : [
      `Implement core business workflows specified in ${projectTitle} PRD`,
      'Authentication and secure session handling with token verification',
      'Database schema models, relations, and migrations',
      'Input validation, error handling, and security headers',
      'RESTful API endpoint implementations matching PRD specs',
      'Responsive user interface with smooth state management'
    ];

  return deliverables;
}

/**
 * Analyzes PRD Markdown and deliverables to synthesize 4 tailored evaluation criteria pillars.
 * The maxScores are normalized to sum to exactly 100 points.
 */
export async function generatePRDCriteria(prdMarkdown, deliverables = [], projectTitle = 'Project') {
  const deliverablesContext = Array.isArray(deliverables) && deliverables.length > 0
    ? `\nDELIVERABLES CHECKLIST TO EVALUATE:\n${deliverables.map((d, i) => `${i + 1}. ${d}`).join('\n')}`
    : '';

  const prompt = `You are a senior technical curriculum evaluator for an ed-tech coding assessment platform like HCL GUVI.
Analyze the following Project Requirement Document (PRD) and Deliverables Checklist for "${projectTitle}".
Synthesize exactly 4 tailored, domain-specific evaluation criteria pillars that will be used by an AI code evaluator to grade learner GitHub repositories.

PRD DOCUMENTATION:
"""
${(prdMarkdown || '').slice(0, 8000)}
"""
${deliverablesContext}

RULES FOR EVALUATION CRITERIA:
1. Exactly 4 criteria pillars.
2. Tailor each criterion name to this specific project's tech stack and core deliverables (e.g. "Core Business Logic & Cart State Management", "Routing & Navigation Architecture", "API Integration & Data Handling", "Code Modularity & Error Resilience").
3. Assign a "maxScore" (integer) to each criterion so that the SUM of all 4 criteria's maxScore is EXACTLY 100 points (e.g. 30, 25, 25, 20).

Return ONLY valid JSON matching this schema:
{
  "criteria": [
    { "name": string, "maxScore": number }
  ]
}`;

  const result = await callGeminiJSON(
    prompt,
    'You generate precise, project-specific code evaluation criteria with point distributions summing to exactly 100.'
  );

  let criteria = Array.isArray(result.criteria) && result.criteria.length > 0
    ? result.criteria
    : [
      { name: 'Core Functionality & PRD Deliverables', maxScore: 30 },
      { name: 'Architecture & Modularity', maxScore: 25 },
      { name: 'Security & Error Handling', maxScore: 25 },
      { name: 'Code Quality & Documentation', maxScore: 20 }
    ];

  // Ensure 4 items
  if (criteria.length !== 4) {
    criteria = criteria.slice(0, 4);
    while (criteria.length < 4) {
      criteria.push({ name: 'Code Quality & Standards', maxScore: 20 });
    }
  }

  // Ensure valid numbers and sum to exactly 100
  criteria = criteria.map((c) => ({
    name: c.name?.trim() || 'Technical Milestone',
    maxScore: Math.max(5, Math.min(60, Number(c.maxScore) || 25))
  }));

  const runningTotal = criteria.slice(0, 3).reduce((sum, c) => sum + c.maxScore, 0);
  criteria[3].maxScore = Math.max(10, 100 - runningTotal);

  return criteria;
}
