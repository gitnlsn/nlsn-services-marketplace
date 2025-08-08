#!/usr/bin/env node

/**
 * Full Test Suite Runner
 * 
 * This script:
 * 1. Runs npm run check (mermaid validation, typecheck, build, and unit tests)
 * 2. Starts the production server
 * 3. Runs all e2e tests sequentially
 * 4. Stops on any errors
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, colors.cyan);
  console.log('='.repeat(60) + '\n');
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Function to run a command and handle errors
function runCommand(command, description, options = {}) {
  logInfo(`Running: ${command}`);
  try {
    execSync(command, { 
      stdio: 'inherit',
      ...options 
    });
    logSuccess(`${description} completed successfully`);
    return true;
  } catch (error) {
    logError(`${description} failed`);
    if (error.message) {
      console.error(error.message);
    }
    return false;
  }
}

// Function to find all e2e test files
function findE2ETests() {
  const e2eDir = path.join(process.cwd(), 'e2e', 'tests');
  try {
    const files = fs.readdirSync(e2eDir);
    return files
      .filter(file => file.endsWith('.test.ts'))
      .map(file => ({
        name: file.replace('.test.ts', ''),
        path: path.join(e2eDir, file)
      }));
  } catch (error) {
    logError('Could not find e2e tests directory');
    return [];
  }
}

// Function to kill any process on port 3000
function killPort3000() {
  logInfo('Checking for processes on port 3000...');
  try {
    // Try to find and kill process on port 3000
    if (process.platform === 'win32') {
      // Windows
      try {
        execSync('netstat -ano | findstr :3000', { stdio: 'pipe' });
        execSync('for /f "tokens=5" %a in (\'netstat -ano ^| findstr :3000\') do taskkill /PID %a /F', { stdio: 'pipe' });
        logSuccess('Killed process on port 3000');
      } catch {
        // No process found or couldn't kill
      }
    } else {
      // Unix/Linux/Mac
      try {
        const pid = execSync('lsof -t -i:3000', { encoding: 'utf-8', stdio: 'pipe' }).trim();
        if (pid) {
          execSync(`kill -9 ${pid}`, { stdio: 'pipe' });
          logSuccess(`Killed process ${pid} on port 3000`);
          // Wait a bit for port to be released
          execSync('sleep 1');
        }
      } catch {
        // No process found on port 3000
      }
    }
  } catch (error) {
    // Port is free or error occurred
    logInfo('Port 3000 is available');
  }
}

// Function to start the production server
function startProductionServer() {
  return new Promise((resolve, reject) => {
    // Kill any existing process on port 3000 first
    killPort3000();
    
    logInfo('Starting server...');
    
    const server = spawn('npx', ['next', 'dev'], {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let serverReady = false;
    const timeout = setTimeout(() => {
      if (!serverReady) {
        server.kill();
        reject(new Error('Server startup timeout (30 seconds)'));
      }
    }, 30000);

    // Listen for server output
    server.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(`  ${colors.yellow}[SERVER]${colors.reset} ${output}`);
      
      // Check if server is ready
      if (output.includes('Ready on') || output.includes('Ready in') || output.includes('started server on') || output.includes('Listening on') || output.includes('- Local:')) {
        serverReady = true;
        clearTimeout(timeout);
        logSuccess('Production server is ready');
        setTimeout(() => resolve(server), 2000); // Give it 2 more seconds to stabilize
      }
    });

    server.stderr.on('data', (data) => {
      process.stderr.write(`  ${colors.red}[SERVER ERROR]${colors.reset} ${data}`);
    });

    server.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    server.on('exit', (code) => {
      if (!serverReady) {
        clearTimeout(timeout);
        reject(new Error(`Server exited with code ${code}`));
      }
    });
  });
}

// Function to run a single e2e test
async function runE2ETest(testFile, serverProcess) {
  const testName = testFile.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  logSection(`Running E2E Test: ${testName}`);
  
  return new Promise((resolve) => {
    const test = spawn('npx', ['tsx', testFile.path], {
      stdio: 'inherit',
      env: {
        ...process.env,
        E2E_BASE_URL: 'http://localhost:3000'
      }
    });

    test.on('exit', (code) => {
      if (code === 0) {
        logSuccess(`${testName} test passed`);
        resolve(true);
      } else {
        logError(`${testName} test failed with exit code ${code}`);
        resolve(false);
      }
    });

    test.on('error', (error) => {
      logError(`Failed to run ${testName} test: ${error.message}`);
      resolve(false);
    });
  });
}

// Global server process for cleanup
let globalServerProcess: any = null;

// Cleanup function to kill server
function cleanupServer() {
  if (globalServerProcess) {
    logInfo('Shutting down production server...');
    try {
      // Try graceful shutdown first
      globalServerProcess.kill('SIGTERM');
      
      // Force kill after 2 seconds if still running
      setTimeout(() => {
        try {
          globalServerProcess.kill('SIGKILL');
        } catch (e) {
          // Process might already be dead
        }
      }, 2000);
      
      logSuccess('Server shutdown initiated');
    } catch (error) {
      logError(`Error shutting down server: ${error.message}`);
    }
    globalServerProcess = null;
  }
}

// Main execution
async function main() {
  let serverProcess = null;
  let exitCode = 0;

  try {
    console.clear();
    logSection('Full Test Suite Runner');
    const startTime = Date.now();

    // Step 1: Run npm run check
    logSection('Step 1: Running Quality Checks');
    logInfo('This includes: mermaid validation, typecheck, build, and unit tests');
    
    if (!runCommand('npm run check', 'Quality checks')) {
      logError('Quality checks failed. Aborting test suite.');
      process.exit(1);
    }

    // Step 2: Start production server
    logSection('Step 2: Starting Production Server');
    
    try {
      serverProcess = await startProductionServer();
      globalServerProcess = serverProcess; // Store globally for cleanup
    } catch (error) {
      logError(`Failed to start production server: ${error.message}`);
      process.exit(1);
    }

    // Step 3: Find and run all e2e tests
    logSection('Step 3: Running E2E Tests');
    
    const e2eTests = findE2ETests();
    if (e2eTests.length === 0) {
      logError('No e2e tests found');
      exitCode = 1;
    } else {
      logInfo(`Found ${e2eTests.length} e2e test file(s):`);
      e2eTests.forEach(test => log(`  - ${test.name}`, colors.yellow));
      console.log();

      // Run each test sequentially
      let allTestsPassed = true;
      for (const test of e2eTests) {
        const passed = await runE2ETest(test, serverProcess);
        if (!passed) {
          allTestsPassed = false;
          exitCode = 1;
          logError('Stopping test suite due to test failure');
          break;
        }
      }

      if (allTestsPassed) {
        logSection('✅ All Tests Passed!');
      } else {
        logSection('❌ Test Suite Failed');
      }
    }

    // Display execution time
    const duration = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    logInfo(`Total execution time: ${minutes}m ${seconds}s`);

  } catch (error) {
    logError(`Unexpected error: ${error.message}`);
    console.error(error);
    exitCode = 1;
  } finally {
    // Clean up: kill the server process
    cleanupServer();
    
    // Double-check and kill any remaining process on port 3000
    setTimeout(() => {
      killPort3000();
    }, 500);

    // Exit with appropriate code after cleanup
    setTimeout(() => {
      process.exit(exitCode);
    }, 1000);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n\nTest suite interrupted by user', colors.yellow);
  cleanupServer();
  process.exit(130);
});

process.on('SIGTERM', () => {
  log('\n\nTest suite terminated', colors.yellow);
  cleanupServer();
  process.exit(143);
});

process.on('exit', () => {
  cleanupServer();
});

process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error.message}`);
  console.error(error);
  cleanupServer();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled rejection at: ${promise}, reason: ${reason}`);
  cleanupServer();
  process.exit(1);
});

// Run the main function
main().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  cleanupServer();
  process.exit(1);
});