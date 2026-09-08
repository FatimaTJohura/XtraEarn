const fs = require('fs');
const js = fs.readFileSync('public/js/admin.js', 'utf8');

const functions = [
  'loadCommissionDashboard',
  'openCommissionSimulatorModal',
  'openCommissionRuleModal',
  'runCommissionSimulation',
  'saveCommissionRule'
];

functions.forEach(fn => {
  const idx = js.indexOf('function ' + fn) !== -1 ? js.indexOf('function ' + fn) : js.indexOf(fn + '(');
  console.log(fn, idx !== -1 ? 'found at line ' + js.substring(0, idx).split('\n').length : 'NOT found');
  if (idx !== -1) {
    console.log(js.substring(idx, idx + 800));
    console.log('-----------------------------------------');
  }
});
