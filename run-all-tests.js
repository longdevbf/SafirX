#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

// Test configurations
const TEST_CONFIGS = [
  {
    name: 'Basic Database Test',
    file: 'test-database.js',
    description: 'Tests basic database connection, table creation, and API endpoints',
    timeout: 30000 // 30 seconds
  },
  {
    name: 'Collections Database Test',
    file: 'test-collections-db.js',
    description: 'Tests collections-specific database operations and functionality',
    timeout: 45000 // 45 seconds
  },
  {
    name: 'Advanced Performance Test',
    file: 'test-database-advanced.js',
    description: 'Tests database performance, concurrency, and data validation',
    timeout: 60000 // 60 seconds
  }
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

async function runSingleTest(testConfig) {
  const { name, file, description, timeout } = testConfig;
  
  colorLog(`\n${'='.repeat(60)}`, 'cyan');
  colorLog(`🧪 Running: ${name}`, 'bright');
  colorLog(`📝 Description: ${description}`, 'blue');
  colorLog(`⏱️  Timeout: ${timeout / 1000}s`, 'yellow');
  colorLog(`${'='.repeat(60)}`, 'cyan');
  
  const startTime = Date.now();
  
  try {
    // Check if test file exists
    const fs = require('fs');
    if (!fs.existsSync(file)) {
      throw new Error(`Test file not found: ${file}`);
    }
    
    // Run the test with timeout
    const { stdout, stderr } = await execAsync(`node ${file}`, {
      timeout: timeout,
      cwd: process.cwd()
    });
    
    const duration = Date.now() - startTime;
    
    colorLog(`✅ ${name} completed successfully in ${duration}ms`, 'green');
    
    if (stdout) {
      console.log(stdout);
    }
    
    if (stderr) {
      colorLog('⚠️  Warnings:', 'yellow');
      console.log(stderr);
    }
    
    return { success: true, duration, output: stdout, warnings: stderr };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    colorLog(`❌ ${name} failed after ${duration}ms`, 'red');
    
    if (error.code === 'TIMEOUT') {
      colorLog(`⏰ Test timed out after ${timeout / 1000} seconds`, 'red');
    } else {
      colorLog(`💥 Error: ${error.message}`, 'red');
    }
    
    if (error.stdout) {
      colorLog('📤 stdout:', 'yellow');
      console.log(error.stdout);
    }
    
    if (error.stderr) {
      colorLog('📥 stderr:', 'yellow');
      console.log(error.stderr);
    }
    
    return { success: false, duration, error: error.message };
  }
}

async function checkPrerequisites() {
  colorLog('\n🔍 Checking prerequisites...', 'blue');
  
  const checks = [
    {
      name: 'Node.js',
      check: () => execAsync('node --version'),
      required: true
    },
    {
      name: 'PostgreSQL connection',
      check: () => execAsync('node -e "console.log(process.env.DATABASE_URL ? \'Found\' : \'Not found\')"'),
      required: true
    },
    {
      name: 'npm packages',
      check: () => execAsync('npm list pg'),
      required: true
    }
  ];
  
  for (const check of checks) {
    try {
      const result = await check.check();
      colorLog(`✅ ${check.name}: OK`, 'green');
      if (result.stdout.trim()) {
        console.log(`   ${result.stdout.trim()}`);
      }
    } catch (error) {
      if (check.required) {
        colorLog(`❌ ${check.name}: FAILED (required)`, 'red');
        throw new Error(`Prerequisite check failed: ${check.name}`);
      } else {
        colorLog(`⚠️  ${check.name}: FAILED (optional)`, 'yellow');
      }
    }
  }
}

async function runAllTests() {
  const totalStartTime = Date.now();
  
  colorLog('\n🚀 Starting comprehensive database test suite...', 'bright');
  
  try {
    await checkPrerequisites();
  } catch (error) {
    colorLog(`❌ Prerequisites check failed: ${error.message}`, 'red');
    process.exit(1);
  }
  
  const results = [];
  
  for (const testConfig of TEST_CONFIGS) {
    const result = await runSingleTest(testConfig);
    results.push({ ...result, testName: testConfig.name });
    
    // Add a small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const totalDuration = Date.now() - totalStartTime;
  
  // Print summary
  colorLog('\n' + '='.repeat(80), 'magenta');
  colorLog('📊 TEST SUMMARY', 'bright');
  colorLog('='.repeat(80), 'magenta');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  colorLog(`\n🎯 Total Tests: ${results.length}`, 'blue');
  colorLog(`✅ Successful: ${successful}`, 'green');
  colorLog(`❌ Failed: ${failed}`, 'red');
  colorLog(`⏱️  Total Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`, 'yellow');
  
  colorLog('\n📋 Individual Results:', 'blue');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const duration = `${result.duration}ms`;
    colorLog(`  ${index + 1}. ${status} ${result.testName} (${duration})`, 
             result.success ? 'green' : 'red');
  });
  
  if (failed > 0) {
    colorLog('\n💥 Some tests failed. Check the output above for details.', 'red');
    process.exit(1);
  } else {
    colorLog('\n🎉 All tests passed successfully!', 'green');
    process.exit(0);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Database Test Runner

Usage: node run-all-tests.js [options]

Options:
  --help, -h          Show this help message
  --list, -l          List available tests
  --test <name>       Run a specific test by name
  --timeout <ms>      Set custom timeout (default: varies by test)

Examples:
  node run-all-tests.js                    # Run all tests
  node run-all-tests.js --list             # List available tests
  node run-all-tests.js --test "Basic"     # Run only basic test
  node run-all-tests.js --timeout 90000    # Set 90 second timeout
  `);
  process.exit(0);
}

if (args.includes('--list') || args.includes('-l')) {
  colorLog('\n📋 Available Tests:', 'blue');
  TEST_CONFIGS.forEach((config, index) => {
    colorLog(`  ${index + 1}. ${config.name}`, 'green');
    colorLog(`     File: ${config.file}`, 'yellow');
    colorLog(`     Description: ${config.description}`, 'blue');
    colorLog(`     Timeout: ${config.timeout / 1000}s`, 'magenta');
    console.log();
  });
  process.exit(0);
}

const testNameIndex = args.indexOf('--test');
if (testNameIndex !== -1 && args[testNameIndex + 1]) {
  const testName = args[testNameIndex + 1];
  const testConfig = TEST_CONFIGS.find(config => 
    config.name.toLowerCase().includes(testName.toLowerCase())
  );
  
  if (!testConfig) {
    colorLog(`❌ Test not found: ${testName}`, 'red');
    colorLog('Available tests:', 'blue');
    TEST_CONFIGS.forEach(config => {
      colorLog(`  - ${config.name}`, 'green');
    });
    process.exit(1);
  }
  
  runSingleTest(testConfig).then(result => {
    process.exit(result.success ? 0 : 1);
  });
} else {
  runAllTests();
}