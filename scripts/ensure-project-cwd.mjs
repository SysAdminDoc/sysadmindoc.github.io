import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const expectedPackageName = 'sysadmindoc-portfolio';
const cwd = process.cwd();
const packagePath = path.join(cwd, 'package.json');
const testDir = path.join(cwd, 'test');

function fail(message) {
  console.error(`ensure-project-cwd: ${message}`);
  console.error(`ensure-project-cwd: current cwd is ${cwd}`);
  process.exit(1);
}

if (!fs.existsSync(packagePath)) {
  fail('package.json was not found; run this command from the repository root.');
}

let pkg;
try {
  pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
} catch (error) {
  fail(`package.json could not be parsed: ${error.message}`);
}

if (pkg.name !== expectedPackageName) {
  fail(`expected package name ${expectedPackageName}, found ${pkg.name || '(missing)'}.`);
}

if (!fs.existsSync(testDir) || !fs.statSync(testDir).isDirectory()) {
  fail('test directory was not found; refusing to run ambient test discovery.');
}
