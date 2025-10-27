#!/usr/bin/env node
/**
 * Security audit script for frontend dependencies
 * Run this regularly to check for security issues
 */

const { execSync } = require('child_process');
const fs = require('fs');

function printHeader(text) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${text}`);
  console.log('='.repeat(60) + '\n');
}

function runNpmAudit() {
  printHeader('Running npm audit for Node.js dependencies');
  
  try {
    const result = execSync('npm audit --json', { encoding: 'utf-8' });
    const data = JSON.parse(result);
    
    const { vulnerabilities } = data;
    const total = Object.keys(vulnerabilities).length;
    
    if (total === 0) {
      console.log('✅ No known vulnerabilities found in Node.js dependencies');
      return true;
    } else {
      console.log(`⚠️  Found ${total} vulnerabilities:`);
      
      const summary = data.metadata.vulnerabilities;
      if (summary.critical > 0) console.log(`  Critical: ${summary.critical}`);
      if (summary.high > 0) console.log(`  High: ${summary.high}`);
      if (summary.moderate > 0) console.log(`  Moderate: ${summary.moderate}`);
      if (summary.low > 0) console.log(`  Low: ${summary.low}`);
      
      console.log('\n💡 Run "npm audit fix" to fix automatically');
      return false;
    }
  } catch (error) {
    if (error.stdout) {
      const data = JSON.parse(error.stdout);
      const summary = data.metadata.vulnerabilities;
      const total = summary.critical + summary.high + summary.moderate + summary.low;
      
      if (total > 0) {
        console.log(`⚠️  Found ${total} vulnerabilities:`);
        if (summary.critical > 0) console.log(`  Critical: ${summary.critical}`);
        if (summary.high > 0) console.log(`  High: ${summary.high}`);
        if (summary.moderate > 0) console.log(`  Moderate: ${summary.moderate}`);
        if (summary.low > 0) console.log(`  Low: ${summary.low}`);
        console.log('\n💡 Run "npm audit fix" to fix automatically');
        return false;
      }
    }
    console.log('❌ Error running npm audit');
    return false;
  }
}

function checkOutdatedPackages() {
  printHeader('Checking for outdated packages');
  
  try {
    const result = execSync('npm outdated --json', { encoding: 'utf-8' });
    
    if (!result) {
      console.log('✅ All packages are up to date');
      return true;
    }
    
    const outdated = JSON.parse(result);
    const count = Object.keys(outdated).length;
    
    if (count === 0) {
      console.log('✅ All packages are up to date');
      return true;
    } else {
      console.log(`⚠️  ${count} packages have updates available:\n`);
      
      let shown = 0;
      for (const [name, info] of Object.entries(outdated)) {
        if (shown < 10) {
          console.log(`  ${name}: ${info.current} → ${info.latest}`);
          shown++;
        }
      }
      
      if (count > 10) {
        console.log(`\n  ... and ${count - 10} more`);
      }
      
      console.log('\n💡 Run "npm update" to update packages');
      return false;
    }
  } catch (error) {
    // npm outdated returns exit code 1 if there are outdated packages
    if (error.stdout) {
      const outdated = JSON.parse(error.stdout);
      const count = Object.keys(outdated).length;
      
      console.log(`⚠️  ${count} packages have updates available`);
      console.log('💡 Run "npm update" to update packages');
      return false;
    }
    console.log('✅ All packages are up to date');
    return true;
  }
}

function checkAngularVersion() {
  printHeader('Checking Angular version');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const angularVersion = packageJson.dependencies['@angular/core'];
    
    console.log(`Angular version: ${angularVersion}`);
    
    const majorVersion = parseInt(angularVersion.replace(/[^\d]/g, ''));
    
    if (majorVersion >= 17) {
      console.log('✅ Angular version is current and secure');
      return true;
    } else if (majorVersion >= 15) {
      console.log('⚠️  Angular version is supported but consider upgrading');
      return true;
    } else {
      console.log('⚠️  Angular version is outdated, upgrade recommended');
      return false;
    }
  } catch (error) {
    console.log('❌ Error checking Angular version');
    return false;
  }
}

function checkForSRI() {
  printHeader('Checking for Subresource Integrity (SRI)');
  
  try {
    const indexHtml = fs.readFileSync('src/index.html', 'utf-8');
    
    // Check for script tags with CDN sources
    const scriptTags = indexHtml.match(/<script[^>]*src=["']https?:\/\/[^"']*["'][^>]*>/g) || [];
    const scriptsWithoutSRI = scriptTags.filter(tag => !tag.includes('integrity='));
    
    if (scriptsWithoutSRI.length === 0) {
      console.log('✅ All external scripts have SRI hashes');
      return true;
    } else {
      console.log(`⚠️  ${scriptsWithoutSRI.length} external script(s) without SRI:`);
      scriptsWithoutSRI.forEach(tag => {
        const match = tag.match(/src=["']([^"']*)["']/);
        if (match) console.log(`  ${match[1]}`);
      });
      return false;
    }
  } catch (error) {
    console.log('⚠️  Could not check index.html');
    return true;
  }
}

function generateReport(results) {
  printHeader('Security Audit Report');
  
  const totalChecks = Object.keys(results).length;
  const passedChecks = Object.values(results).filter(v => v).length;
  
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Total Checks: ${totalChecks}`);
  console.log(`Passed: ${passedChecks}`);
  console.log(`Failed: ${totalChecks - passedChecks}`);
  console.log(`Score: ${((passedChecks/totalChecks)*100).toFixed(1)}%`);
  
  if (passedChecks === totalChecks) {
    console.log('\n✅ All security checks passed!');
    return 0;
  } else {
    console.log('\n⚠️  Some security checks failed. Review the issues above.');
    return 1;
  }
}

function main() {
  printHeader('Frontend Security Audit');
  console.log(`Started at: ${new Date().toLocaleString()}`);
  
  const results = {
    npm_audit: runNpmAudit(),
    outdated_packages: checkOutdatedPackages(),
    angular_version: checkAngularVersion(),
    sri_check: checkForSRI()
  };
  
  const exitCode = generateReport(results);
  
  console.log('\n💡 Tip: Run this script regularly (weekly) to stay secure');
  console.log('💡 Tip: Add to CI/CD pipeline for automated checking\n');
  
  process.exit(exitCode);
}

main();
