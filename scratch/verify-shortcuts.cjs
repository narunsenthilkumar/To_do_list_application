const path = require('path');
const fs = require('fs');

const desktopPath = path.join(process.env.USERPROFILE, 'Desktop', 'Taskora.lnk');
const startMenuPath = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Taskora.lnk');

console.log('Desktop Shortcut path:', desktopPath);
console.log('Desktop Shortcut exists:', fs.existsSync(desktopPath));

console.log('Start Menu Shortcut path:', startMenuPath);
console.log('Start Menu Shortcut exists:', fs.existsSync(startMenuPath));
