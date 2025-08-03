#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of test files that need fixing
const testFiles = [
  'src/test/integration/advanced-booking-workflow.test.ts',
  'src/test/services/booking-reminder-service.test.ts',
  'src/test/services/booking.service.test.ts',
  'src/test/services/group-booking-service.test.ts',
  'src/test/services/recurring-booking-service.test.ts',
  'src/test/services/service-bundle-service.test.ts',
  'src/test/services/service.service.test.ts',
  'src/test/services/user-service.test.ts',
  'src/test/services/user.service.test.ts',
  'src/test/services/waitlist-service.test.ts',
];

function fixTestFile(filePath) {
  console.log(`Fixing ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add import for asPrismaClient if not present
  if (!content.includes('asPrismaClient') && !content.includes('from "../types"')) {
    // Check if it already imports from setup
    if (content.includes('from "../setup"')) {
      // Add asPrismaClient to existing import
      content = content.replace(
        /import\s+{([^}]+)}\s+from\s+"\.\.\/setup"/,
        (match, imports) => {
          return `import {${imports}} from "../setup";\nimport { asPrismaClient } from "../types"`;
        }
      );
    } else if (content.includes('from "../helpers/database"')) {
      // Add import after database import
      content = content.replace(
        /import[^;]+from\s+"\.\.\/helpers\/database"[^;]*;/,
        (match) => {
          return `${match}\nimport { asPrismaClient } from "../types";`;
        }
      );
    }
  }
  
  // Replace all instances of `db: testDb,` with `db: asPrismaClient(testDb),`
  content = content.replace(/(\s+)db:\s*testDb,/g, '$1db: asPrismaClient(testDb),');
  
  // Replace all instances of `{ db: testDb }` with `{ db: asPrismaClient(testDb) }`
  content = content.replace(/{\s*db:\s*testDb\s*}/g, '{ db: asPrismaClient(testDb) }');
  
  // Replace all instances of `{ db: testDb,` with `{ db: asPrismaClient(testDb),`
  content = content.replace(/{\s*db:\s*testDb,/g, '{ db: asPrismaClient(testDb),');
  
  // Fix arrow function parameter types
  content = content.replace(/\((b)\)\s*=>\s*b\./g, '(b: any) => b.');
  content = content.replace(/\((s)\)\s*=>\s*s\./g, '(s: any) => s.');
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed ${filePath}`);
}

// Process all test files
testFiles.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    fixTestFile(fullPath);
  } else {
    console.log(`File not found: ${fullPath}`);
  }
});

console.log('Done fixing test files!');