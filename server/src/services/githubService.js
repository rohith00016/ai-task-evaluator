import AdmZip from 'adm-zip';

/**
 * Parses GitHub owner and repo name from various URL formats.
 */
export function parseGitHubUrl(repoUrl) {
  if (!repoUrl || typeof repoUrl !== 'string') return null;
  const match = repoUrl.trim().match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git|\/)?$/i);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/i, '')
  };
}

const IGNORED_PATH_SEGMENTS = [
  'node_modules',
  '.git',
  '.github',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'coverage',
  '.cache',
  'vendor',
  '__pycache__'
];

const IGNORED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
  '.woff', '.woff2', '.ttf', '.eot',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.mp4', '.mp3', '.pdf', '.exe', '.dll', '.bin',
  '.lock', '.map'
]);

const ALLOWED_CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.sql', '.java', '.go', '.rb', '.php',
  '.html', '.css', '.scss', '.json', '.env.example', '.md'
]);

/**
 * Downloads and extracts the actual source code files from a public GitHub repository.
 */
export async function fetchRepositoryCode(repoUrl, branch = 'main') {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    return {
      isGitHub: false,
      errorType: 'INVALID_URL',
      error: 'Invalid GitHub URL format. Please provide a link like https://github.com/owner/repository',
      hint: 'Valid URL example: https://github.com/username/repository-name',
      files: [],
      repoMeta: null
    };
  }

  const { owner, repo } = parsed;

  const githubHeaders = {
    'User-Agent': 'AI-Task-Evaluator-Engine/1.0',
    Accept: 'application/vnd.github.v3+json'
  };
  if (process.env.GITHUB_TOKEN) {
    githubHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const result = {
    isGitHub: true,
    owner,
    repo,
    branch,
    repoMeta: null,
    files: [],
    packageJson: null,
    readme: null,
    totalFilesFound: 0,
    downloadSuccess: false
  };

  // 1. Fetch Repository Metadata
  try {
    const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: githubHeaders
    });

    if (metaRes.status === 404) {
      return {
        isGitHub: true,
        owner,
        repo,
        branch,
        errorType: 'REPO_NOT_FOUND_OR_PRIVATE',
        error: `Repository "${owner}/${repo}" was not found or is private. Please ensure the repository is set to Public on GitHub and the URL is spelled correctly.`,
        hint: 'GitHub requires repositories to be set to Public for automated code grading. Check repository visibility in GitHub Settings > Danger Zone.'
      };
    }

    if (metaRes.status === 403) {
      const isRateLimited = metaRes.headers.get('x-ratelimit-remaining') === '0';
      return {
        isGitHub: true,
        owner,
        repo,
        branch,
        errorType: isRateLimited ? 'RATE_LIMITED' : 'ACCESS_FORBIDDEN',
        error: isRateLimited
          ? 'GitHub API rate limit temporarily exceeded. Please try again in a few minutes.'
          : `Access to repository "${owner}/${repo}" was denied by GitHub (HTTP 403).`,
        hint: 'GitHub restricts unauthenticated requests to 60/hour. Try again shortly.'
      };
    }

    if (!metaRes.ok) {
      return {
        isGitHub: true,
        owner,
        repo,
        branch,
        errorType: 'REPO_FETCH_FAILED',
        error: `Could not access GitHub repository "${owner}/${repo}" (HTTP ${metaRes.status}).`,
        hint: 'Please verify the repository URL on GitHub.'
      };
    }

    const meta = await metaRes.json();
    result.repoMeta = {
      name: meta.name,
      fullName: meta.full_name,
      description: meta.description,
      defaultBranch: meta.default_branch,
      language: meta.language,
      stars: meta.stargazers_count,
      topics: meta.topics || []
    };
    if (!branch || branch === 'main') {
      result.branch = meta.default_branch || 'main';
    }
  } catch (err) {
    console.error('[GitHubService] Metadata fetch error:', err.message);
    return {
      isGitHub: true,
      owner,
      repo,
      branch,
      errorType: 'NETWORK_ERROR',
      error: `Failed to connect to GitHub API: ${err.message}`,
      hint: 'Please check your internet connection or try again later.'
    };
  }

  const targetBranch = result.branch || branch || 'main';

  // 2. Fetch full repository archive via GitHub zipball
  try {
    const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${targetBranch}`;
    console.log(`[GitHubService] Downloading zipball: ${zipUrl}`);

    const zipRes = await fetch(zipUrl, {
      redirect: 'follow',
      headers: githubHeaders
    });

    if (zipRes.status === 404) {
      return {
        isGitHub: true,
        owner,
        repo,
        branch: targetBranch,
        errorType: 'BRANCH_NOT_FOUND',
        error: `Branch "${targetBranch}" was not found in repository "${owner}/${repo}".`,
        hint: `Ensure branch "${targetBranch}" is pushed to GitHub, or specify the correct branch name (e.g. "main" or "master").`
      };
    }

    if (!zipRes.ok) {
      return {
        isGitHub: true,
        owner,
        repo,
        branch: targetBranch,
        errorType: 'DOWNLOAD_FAILED',
        error: `Failed to download repository archive from GitHub (HTTP ${zipRes.status}).`,
        hint: 'Please verify that the repository and branch exist on GitHub.'
      };
    }

    const arrayBuffer = await zipRes.arrayBuffer();
    const zipBuffer = Buffer.from(arrayBuffer);
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();

    result.downloadSuccess = true;
    result.totalFilesFound = entries.length;

    let accumulatedBytes = 0;
    const MAX_TOTAL_BYTES = 250 * 1024; // 250KB max code payload for Gemini

    for (const entry of entries) {
      if (entry.isDirectory) continue;

      const rawName = entry.entryName;
      // GitHub zipball prepends root folder name (e.g. "owner-repo-sha/")
      const relativePath = rawName.split('/').slice(1).join('/');
      if (!relativePath) continue;

      // Skip ignored directories
      const pathParts = relativePath.split('/');
      const isIgnoredDir = pathParts.some((part) => IGNORED_PATH_SEGMENTS.includes(part.toLowerCase()));
      if (isIgnoredDir) continue;

      // Skip lockfiles
      if (relativePath.endsWith('package-lock.json') || relativePath.endsWith('yarn.lock') || relativePath.endsWith('pnpm-lock.yaml')) {
        continue;
      }

      // Check extension
      const dotIndex = relativePath.lastIndexOf('.');
      const ext = dotIndex !== -1 ? relativePath.slice(dotIndex).toLowerCase() : '';
      if (IGNORED_EXTENSIONS.has(ext)) continue;

      const isCode = ALLOWED_CODE_EXTENSIONS.has(ext) || relativePath.endsWith('Dockerfile');
      if (!isCode) continue;

      // Skip large files (> 35KB)
      if (entry.header.size > 35 * 1024) continue;

      try {
        const content = entry.getData().toString('utf8');

        // Check if binary / corrupt
        if (content.includes('\u0000')) continue;

        // Capture package.json
        if (relativePath === 'package.json') {
          try {
            result.packageJson = JSON.parse(content);
          } catch {
            // ignore parse error
          }
        }

        // Capture README.md
        if (relativePath.toLowerCase() === 'readme.md') {
          result.readme = content.slice(0, 2000);
        }

        if (accumulatedBytes + content.length > MAX_TOTAL_BYTES) {
          continue;
        }

        accumulatedBytes += content.length;

        // Format lines with line numbers for accurate citation
        const lines = content.split('\n');
        const numberedLines = lines
          .map((line, idx) => `${String(idx + 1).padStart(4, ' ')} | ${line}`)
          .join('\n');

        result.files.push({
          path: relativePath,
          size: entry.header.size,
          lineCount: lines.length,
          content: numberedLines,
          rawContent: content
        });
      } catch {
        // skip file decode error
      }

      if (result.files.length >= 30) {
        break;
      }
    }

    // Check if any source code files were extracted
    if (result.files.length === 0) {
      return {
        isGitHub: true,
        owner,
        repo,
        branch: targetBranch,
        errorType: 'EMPTY_REPOSITORY',
        error: `No source code files were found in repository "${owner}/${repo}" on branch "${targetBranch}".`,
        hint: `The repository appears empty or contains no supported code files (.js, .jsx, .ts, .tsx, .py, .java, etc.). Please commit and push your project code files.`
      };
    }

    console.log(`[GitHubService] Successfully unpacked ${result.files.length} code files (${accumulatedBytes} bytes) for ${owner}/${repo}`);
    return result;
  } catch (err) {
    console.error('[GitHubService] Zipball extraction error:', err.message);
    return {
      isGitHub: true,
      owner,
      repo,
      branch: targetBranch,
      errorType: 'EXTRACTION_ERROR',
      error: `Failed to extract repository code: ${err.message}`,
      hint: 'Please verify that the repository is accessible and can be downloaded.'
    };
  }
}
