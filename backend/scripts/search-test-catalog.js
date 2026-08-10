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
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const files = walk(path.resolve(__dirname, '../../frontend/src'));
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('resultFields') || content.includes('testCatalog')) {
    console.log(`Found in: ${file}`);
  }
});
