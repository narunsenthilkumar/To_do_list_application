const fs = require('fs');
const path = require('path');

const dirs = ['dist', 'dist-electron', 'out'];
for (const dir of dirs) {
  const targetPath = path.join(__dirname, '..', dir);
  if (fs.existsSync(targetPath)) {
    try {
      fs.rmSync(targetPath, { recursive: true, force: true });
      console.log(`Successfully cleaned ${dir}`);
    } catch (err) {
      console.warn(`Warning: Could not clean ${dir}:`, err.message);
    }
  }
}
