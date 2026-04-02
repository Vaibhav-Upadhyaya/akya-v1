import { existsSync } from 'node:fs';

const MAIN_PY_PATH = 'C:\\Users\\Vaibhav Upadhyaya\\OneDrive\\Documents\\MASTER\\antigravity files\\Akya\\main.py';

console.log('=== Setup Check ===\n');

console.log('1. Checking main.py path:');
console.log(`   Path: ${MAIN_PY_PATH}`);
console.log(`   Exists: ${existsSync(MAIN_PY_PATH) ? '✓ YES' : '✗ NO'}`);

if (!existsSync(MAIN_PY_PATH)) {
  console.log('\n⚠️  main.py NOT FOUND!');
  console.log('   Set the AKYA_MAIN_PY environment variable to the correct path.');
  console.log('   Example: set AKYA_MAIN_PY=C:\\path\\to\\your\\main.py');
}

console.log('\n2. Testing backend connection:');
try {
  const response = await fetch('http://localhost:8787/health');
  if (response.ok) {
    const data = await response.json();
    console.log('   Backend: ✓ RUNNING');
    console.log(`   Using: ${data.mainPyPath}`);
  } else {
    console.log('   Backend: ✗ NOT RESPONDING');
  }
} catch (error) {
  console.log('   Backend: ✗ NOT RUNNING');
  console.log('   Start it with: npm run dev');
}

console.log('\n===================');
