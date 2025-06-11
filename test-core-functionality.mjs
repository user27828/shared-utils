#!/usr/bin/env node

// Test script to verify core functionality
import { log, turnstile, OptionsManager, optionsManager } from './utils/dist/index.js';

console.log('🧪 Testing core shared-utils functionality...\n');

// Test 1: Log utility
console.log('1️⃣ Testing log utility...');
try {
  log.info('Test log message');
  log.setOptions({ level: 'debug' });
  const logOptions = log.getOptions();
  console.log(`✅ Log utility works! Level: ${logOptions.level}`);
} catch (error) {
  console.log(`❌ Log utility failed: ${error.message}`);
}

// Test 2: Turnstile utility
console.log('\n2️⃣ Testing turnstile utility...');
try {
  turnstile.setOptions({ siteKey: 'test-key', secretKey: 'test-secret' });
  const turnstileOptions = turnstile.getOptions();
  console.log(`✅ Turnstile utility works! Environment: ${turnstileOptions.environment}`);
} catch (error) {
  console.log(`❌ Turnstile utility failed: ${error.message}`);
}

// Test 3: OptionsManager
console.log('\n3️⃣ Testing OptionsManager...');
try {
  const manager = new OptionsManager('test', { defaultKey: 'defaultValue' });
  manager.setOptions({ testKey: 'testValue' });
  const options = manager.getOptions();
  console.log(`✅ OptionsManager works! Options: ${JSON.stringify(options)}`);
} catch (error) {
  console.log(`❌ OptionsManager failed: ${error.message}`);
}

// Test 4: Global options manager
console.log('\n4️⃣ Testing global optionsManager...');
try {
  const allOptions = optionsManager.getAllOptions();
  const registeredUtils = optionsManager.getRegisteredUtilities();
  console.log(`✅ Global optionsManager works! Registered utilities: ${registeredUtils.join(', ')}`);
} catch (error) {
  console.log(`❌ Global optionsManager failed: ${error.message}`);
}

console.log('\n🎉 Core functionality test complete!');
