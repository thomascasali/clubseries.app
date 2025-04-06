require('dotenv').config();
const logger = require('./src/config/logger');

function testLogger() {
  logger.info('Test info message');
  logger.debug('Test debug message');
  logger.warn('Test warning message');
  logger.error('Test error message');
  
  // Test con metadati
  logger.info('Test info with metadata', { user: 'test-user', action: 'login' });
  
  // Test con funzioni annidate
  nestedFunction();
}

function nestedFunction() {
  logger.warn('Warning from nested function');
  
  // Ulteriore nesting
  deeplyNestedFunction();
}

function deeplyNestedFunction() {
  logger.error('Error from deeply nested function');
}

console.log('Starting logger test...');
testLogger();
console.log('Logger test completed');
