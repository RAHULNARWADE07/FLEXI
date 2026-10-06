const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, options = {}) {
  console.log(`> ${cmd}`);
  return execSync(cmd, { stdio: 'inherit', ...options });
}

async function deploy() {
  const projectRoot = path.join(__dirname, '..');
  const publicDir = path.join(projectRoot, 'public');
  const tempDir = path.join(projectRoot, '.deploy_temp');

  console.log('📦 Preparing AquaAgent files for GitHub Pages deployment...');

  try {
    // 1. Clean temp dir if exists
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    // 2. Copy public directory contents to temp dir
    fs.cpSync(publicDir, tempDir, { recursive: true });

    // Add .nojekyll so GitHub Pages doesn't ignore any underscore files
    fs.writeFileSync(path.join(tempDir, '.nojekyll'), '');

    // 3. Initialize git repo in temp dir
    run('git init', { cwd: tempDir });
    run('git config user.name "RAHULNARWADE07"', { cwd: tempDir });
    run('git config user.email "rahulnarwade0003@gmail.com"', { cwd: tempDir });
    run('git checkout -B gh-pages', { cwd: tempDir });
    run('git add -A', { cwd: tempDir });
    run('git commit -m "Deploy AquaAgent to GitHub Pages"', { cwd: tempDir });

    // 4. Get remote origin URL from parent git
    const originUrl = execSync('git config --get remote.origin.url', { cwd: projectRoot, encoding: 'utf8' }).trim();
    run(`git remote add origin "${originUrl}"`, { cwd: tempDir });

    // 5. Force push to gh-pages branch on origin
    console.log('🚀 Pushing to origin/gh-pages...');
    run('git push -f origin gh-pages', { cwd: tempDir });

    console.log('✅ Deployment to gh-pages branch successful!');
  } finally {
    // Cleanup temp dir
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        // ignore cleanup error if file locked temporarily
      }
    }
  }
}

deploy().catch((err) => {
  console.error('❌ Deployment failed:', err.message);
  process.exit(1);
});
