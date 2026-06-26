const fs = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

// 1. Back up package.json
const pkgPath = path.join(__dirname, '../package.json');
const pkgContent = fs.readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgContent);

try {
  // 2. Set type: module
  pkg.type = 'module';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  // 3. Find test files
  const testsDir = path.join(__dirname, '../tests');
  const files = fs.readdirSync(testsDir)
    .filter(file => file.endsWith('.test.mjs'))
    .map(file => path.join('tests', file));

  console.log(`Running tests: ${files.join(', ')}`);

  // 4. Run tests
  const result = spawnSync('node', ['--test', ...files], { stdio: 'inherit' });
  process.exitCode = result.status ?? 0;
} catch (err) {
  console.error('Test runner failed:', err);
  process.exitCode = 1;
} finally {
  // 5. Restore package.json
  fs.writeFileSync(pkgPath, pkgContent);
}
