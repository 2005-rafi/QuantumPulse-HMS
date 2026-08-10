const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
        results = results.concat(walk(filePath));
      }
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.css') || file.endsWith('.html')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const files = walk(path.resolve(__dirname, '../../frontend/src'));
let found = 0;
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes("status === 'error'") || content.includes('status === "error"')) {
    console.log(`Found in: ${file}`);
    found++;
  }
});
console.log(`Total occurrences: ${found}`);
