const fs = require('fs');
const content = fs.readFileSync('script.js', 'utf8');
const lines = content.split('\n');

let tryStack = [];
lines.forEach((line, index) => {
    if (line.includes('try {')) {
        tryStack.push(index + 1);
    }
    // Simple check for catch blocks that aren't .catch
    if (line.includes('catch') && !line.includes('.catch')) {
        if (tryStack.length === 0) {
            console.log(`Potential orphaned catch at line ${index + 1}: ${line.trim()}`);
        } else {
            tryStack.pop();
        }
    }
});

if (tryStack.length > 0) {
    console.log(`Unclosed try blocks starting at lines: ${tryStack.join(', ')}`);
}
