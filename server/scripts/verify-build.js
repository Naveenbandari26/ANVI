#!/usr/bin/env node
/**
 * Verify that all required files exist after build
 */
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'dist/server.js',
  'dist/models/schedule.schema.js',
  'dist/models/call.schema.js',
  'dist/models/conversation.schema.js',
  'dist/models/user.schema.js',
  'dist/models/task.schema.js',
  'dist/models/diary.schema.js',
  'dist/models/user.model.js',
];

console.log('🔍 Verifying build output...\n');

const missingFiles = [];
const existingFiles = [];

requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    existingFiles.push(file);
    console.log(`✅ ${file}`);
  } else {
    missingFiles.push(file);
    console.error(`❌ ${file} - MISSING`);
  }
});

console.log(`\n📊 Summary: ${existingFiles.length}/${requiredFiles.length} files found`);

if (missingFiles.length > 0) {
  console.error(`\n❌ Build verification failed! Missing files:`);
  missingFiles.forEach(file => console.error(`   - ${file}`));
  process.exit(1);
} else {
  console.log(`\n✅ Build verification passed! All files exist.`);
  process.exit(0);
}
