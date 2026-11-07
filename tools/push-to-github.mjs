import { execSync, spawnSync } from 'child_process';

const GCM_EXE = 'H:\\Program Files\\Git\\ucrt64\\bin\\git-credential-manager.exe';
// Official GitHub CLI OAuth Client ID supporting Device Flow + repo creation scope
const GITHUB_CLIENT_ID = '178c6fc778ccc68e1d6a';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function authenticateWithDeviceFlow() {
  const codeRes = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'bom-configurator-setup',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      scope: 'repo workflow',
    }),
  });

  if (!codeRes.ok) {
    const errText = await codeRes.text();
    throw new Error(`Failed to initiate GitHub Device Flow (${codeRes.status}): ${errText}`);
  }

  const deviceData = await codeRes.json();
  const { device_code, user_code, verification_uri, expires_in, interval } = deviceData;

  console.log('====================================================');
  console.log(`GITHUB_LOGIN_URL: ${verification_uri}`);
  console.log(`GITHUB_USER_CODE: ${user_code}`);
  console.log('====================================================');
  console.log('Waiting for user to enter the code and authorize on GitHub...');

  const pollIntervalMs = ((interval || 5) + 1) * 1000;
  const deadline = Date.now() + (expires_in || 900) * 1000;

  while (Date.now() < deadline) {
    await sleep(pollIntervalMs);

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'bom-configurator-setup',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    if (!tokenRes.ok) continue;
    const tokenData = await tokenRes.json();

    if (tokenData.access_token) {
      console.log('GitHub authorization completed successfully!');
      // Store credential in Git Credential Manager for git push
      spawnSync(
        'git',
        ['credential', 'approve'],
        {
          input: `protocol=https\nhost=github.com\nusername=shalomkopla-commits\npassword=${tokenData.access_token}\n\n`,
          encoding: 'utf8',
        }
      );
      return tokenData.access_token;
    }

    if (tokenData.error === 'authorization_pending') {
      continue;
    } else if (tokenData.error === 'slow_down') {
      await sleep(5000);
      continue;
    } else if (tokenData.error) {
      throw new Error(`GitHub Device Flow error: ${tokenData.error_description || tokenData.error}`);
    }
  }

  throw new Error('GitHub Device Flow timed out waiting for user authorization.');
}

async function main() {
  const token = await authenticateWithDeviceFlow();

  // Fetch authenticated user profile
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'bom-configurator-setup',
    },
  });
  const userData = userRes.ok ? await userRes.json() : { login: 'shalomkopla-commits' };
  const owner = userData.login || 'shalomkopla-commits';
  const repoName = 'BOM-CONFIGURATOR';

  console.log(`Authenticated as GitHub user: ${owner}`);

  // Check if repository already exists
  console.log(`Checking if repository ${owner}/${repoName} exists...`);
  const checkRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'bom-configurator-setup',
    },
  });

  let htmlUrl = `https://github.com/${owner}/${repoName}`;
  let cloneUrl = `https://github.com/${owner}/${repoName}.git`;

  if (checkRes.status === 404) {
    console.log(`Repository ${owner}/${repoName} not found. Creating repository on GitHub...`);
    const createRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'bom-configurator-setup',
      },
      body: JSON.stringify({
        name: repoName,
        description: 'קונפיגורטור מוצר – יצירת BOM אוטומטי לפי דרישת לקוח (Next.js + Supabase + Vercel)',
        private: false,
        auto_init: false,
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to create GitHub repo (${createRes.status}): ${errText}`);
    }
    const repoData = await createRes.json();
    htmlUrl = repoData.html_url;
    cloneUrl = repoData.clone_url;
    console.log(`Created repository: ${htmlUrl}`);
  } else if (checkRes.ok) {
    const repoData = await checkRes.json();
    htmlUrl = repoData.html_url;
    cloneUrl = repoData.clone_url;
    console.log(`Repository already exists: ${htmlUrl}`);
  } else {
    const errText = await checkRes.text();
    throw new Error(`Unexpected status checking GitHub repo (${checkRes.status}): ${errText}`);
  }

  // Configure remote origin
  try {
    execSync('git remote get-url origin', { stdio: 'ignore' });
    execSync(`git remote set-url origin ${cloneUrl}`, { stdio: 'inherit' });
  } catch {
    execSync(`git remote add origin ${cloneUrl}`, { stdio: 'inherit' });
  }

  console.log(`Pushing branch 'main' to ${htmlUrl}...`);
  const authedUrl = `https://x-access-token:${token}@github.com/${owner}/${repoName}.git`;
  execSync(`git push -u ${authedUrl} main`, { stdio: 'inherit' });
  // Ensure clean remote URL without embedded token
  execSync(`git remote set-url origin ${cloneUrl}`, { stdio: 'inherit' });
  console.log(`Successfully pushed project to ${htmlUrl}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
