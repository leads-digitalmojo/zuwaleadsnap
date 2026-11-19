const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'leadsnap-rea', 'captures', 'share_view', 'rendered_dom.html'), 'utf8');

console.log('HTML Length:', html.length);

// Extract headings, labels, metrics
const textBlocks = [];
const textRegex = />([^<]{3,100})</g;
let match;
while ((match = textRegex.exec(html)) !== null) {
  const t = match[1].trim();
  if (t && !t.includes('{') && !t.includes('function') && !t.includes('window.')) {
    textBlocks.push(t);
  }
}

console.log('\nSample UI text strings (first 60):');
console.log([...new Set(textBlocks)].slice(0, 60).join(' | '));
