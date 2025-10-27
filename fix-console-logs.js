#!/usr/bin/env node

/**
 * Automated Console.log Replacement Script
 * This script replaces all console.log statements with this.logger.log
 * and adds LoggerService to constructors
 */

const fs = require('fs');
const path = require('path');

// Files to fix (in priority order)
const filesToFix = [
  'src/app/components/admin-dashboard/admin-dashboard.component.ts',
  'src/app/components/edit-client/edit-client.component.ts',
  'src/app/components/new-client/new-client.component.ts',
  'src/app/services/client.service.ts',
  'src/app/components/client-detail/client-detail.component.ts',
  'src/app/components/navbar/navbar.component.ts',
];

let totalFixed = 0;
let totalFiles = 0;

/**
 * Add LoggerService import to the file
 */
function addLoggerImport(content, filePath) {
  // Check if LoggerService is already imported
  if (content.includes('LoggerService')) {
    console.log('  ℹ️  LoggerService already imported');
    return content;
  }
  
  // Determine the correct import path
  const isService = filePath.includes('/services/');
  const importPath = isService 
    ? './logger.service'
    : '../../services/logger.service';
  
  // Find the last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') && lines[i].includes('from')) {
      lastImportIndex = i;
    }
  }
  
  if (lastImportIndex !== -1) {
    const loggerImport = `import { LoggerService } from '${importPath}';`;
    lines.splice(lastImportIndex + 1, 0, loggerImport);
    console.log('  ✅ Added LoggerService import');
    return lines.join('\n');
  }
  
  console.log('  ⚠️  Could not find import section');
  return content;
}

/**
 * Add LoggerService to constructor
 */
function addLoggerToConstructor(content) {
  // Check if logger is already in constructor
  if (content.includes('logger: LoggerService') || content.includes('private logger:')) {
    console.log('  ℹ️  LoggerService already in constructor');
    return content;
  }
  
  // Find constructor
  const constructorRegex = /constructor\s*\(([\s\S]*?)\)\s*\{/;
  const match = content.match(constructorRegex);
  
  if (!match) {
    console.log('  ⚠️  No constructor found');
    return content;
  }
  
  const fullMatch = match[0];
  const params = match[1].trim();
  
  let newParams;
  if (params === '') {
    // Empty constructor
    newParams = 'private logger: LoggerService';
  } else {
    // Add logger as last parameter
    newParams = params + ',\n    private logger: LoggerService';
  }
  
  const newConstructor = `constructor(${newParams}) {`;
  content = content.replace(constructorRegex, newConstructor);
  console.log('  ✅ Added LoggerService to constructor');
  
  return content;
}

/**
 * Replace console.log statements
 */
function replaceConsoleLogs(content) {
  let count = 0;
  
  // Count occurrences
  const logMatches = content.match(/console\.log\(/g);
  const errorMatches = content.match(/console\.error\(/g);
  const warnMatches = content.match(/console\.warn\(/g);
  const debugMatches = content.match(/console\.debug\(/g);
  
  count = (logMatches?.length || 0) + 
          (errorMatches?.length || 0) + 
          (warnMatches?.length || 0) + 
          (debugMatches?.length || 0);
  
  // Replace console.log with this.logger.log
  content = content.replace(/console\.log\(/g, 'this.logger.log(');
  content = content.replace(/console\.error\(/g, 'this.logger.error(');
  content = content.replace(/console\.warn\(/g, 'this.logger.warn(');
  content = content.replace(/console\.debug\(/g, 'this.logger.debug(');
  content = content.replace(/console\.table\(/g, 'this.logger.table(');
  
  if (count > 0) {
    console.log(`  ✅ Replaced ${count} console statements`);
  }
  
  return { content, count };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  console.log(`\n📄 Processing: ${filePath}`);
  
  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    console.log(`  ❌ File not found: ${fullPath}`);
    return 0;
  }
  
  try {
    // Read file
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;
    
    // Step 1: Add import
    content = addLoggerImport(content, filePath);
    
    // Step 2: Add to constructor
    content = addLoggerToConstructor(content);
    
    // Step 3: Replace console.log
    const result = replaceConsoleLogs(content);
    content = result.content;
    const count = result.count;
    
    // Only write if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`  ✅ File updated successfully`);
      totalFiles++;
      return count;
    } else {
      console.log(`  ℹ️  No changes needed`);
      return 0;
    }
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return 0;
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Starting Console.log Replacement Script\n');
  console.log('=' .repeat(60));
  
  // Process each file
  filesToFix.forEach(file => {
    const count = processFile(file);
    totalFixed += count;
  });
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 SUMMARY:');
  console.log(`   Files processed: ${totalFiles}`);
  console.log(`   Console statements replaced: ${totalFixed}`);
  console.log('\n✅ Script completed successfully!');
  console.log('\n📝 Next steps:');
  console.log('   1. Test your application: npm start');
  console.log('   2. Verify everything works correctly');
  console.log('   3. Build for production: npm run build');
  console.log('\n' + '='.repeat(60));
}

// Run the script
main();
