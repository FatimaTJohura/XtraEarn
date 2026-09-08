const fs = require('fs');
const html = fs.readFileSync('public/admin.html', 'utf8');
const match = html.match(/id=['"]view-commission['"]/);
if (match) {
  const idx = match.index;
  console.log('--- HTML START ---');
  console.log(html.substring(idx, idx + 2000));
} else {
  console.log('view-commission not found');
}

// Find modals
const simMatch = html.match(/id=['"]modal-commission-simulate['"]/);
console.log('Simulation modal found:', !!simMatch);
if (simMatch) {
  console.log(html.substring(simMatch.index, simMatch.index + 1000));
}
