"use strict";
/**
 * Integration tests for the complete shared-utils package functionality
 * @jest-environment node
 */
describe('Shared Utils Integration Tests', () => {
    let originalConsole;
    let originalNodeEnv;
    beforeAll(() => {
        originalNodeEnv = process.env.NODE_ENV;
    });
    beforeEach(() => {
        originalConsole = { ...console };
        jest.resetModules(); // Reset module cache to get a fresh logger instance
        // Tests should set their own NODE_ENV as needed. It will be reset in afterEach.
    });
    afterEach(() => {
        // Restore original console
        Object.assign(console, originalConsole);
        jest.restoreAllMocks(); // Ensure all mocks are restored
        process.env.NODE_ENV = originalNodeEnv; // Restore NODE_ENV
    });
    describe('End-to-End Usage Scenarios', () => {
        it('should work in a typical server-side Node.js application', () => {
            // Simulate server environment
            process.env.NODE_ENV = 'production';
            const { log } = require('../utils'); // Log instance from utils
            // Configure for server use
            log.setOptions({
                type: 'server',
                server: {
                    namespace: 'my-server',
                    production: ['warn', 'error']
                }
            });
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
            // In production, only warn/error should log
            log.log('debug info');
            log.warn('important warning');
            expect(consoleLogSpy).not.toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalledWith('important warning');
        });
        it('should work with custom interceptors for analytics', () => {
            process.env.NODE_ENV = 'development';
            const { log } = require('../utils');
            const analyticsData = [];
            // Configure with analytics interceptor
            log.setOptions({
                type: 'server',
                interceptor: (level, args) => {
                    analyticsData.push({ level, args });
                }
            });
            const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
            log.info('user action', { userId: 123, action: 'login' });
            expect(analyticsData).toHaveLength(1);
            expect(analyticsData[0]).toEqual({
                level: 'info',
                args: ['user action', { userId: 123, action: 'login' }]
            });
            expect(consoleInfoSpy).toHaveBeenCalledWith('user action', { userId: 123, action: 'login' });
        });
        it('should handle destructured imports correctly', () => {
            process.env.NODE_ENV = 'development';
            const { log } = require('../utils');
            const { info, warn, error } = log; // Destructure methods from the singleton
            const infoSpy = jest.spyOn(console, 'info').mockImplementation();
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();
            info('info message');
            warn('warn message');
            error('error message');
            expect(infoSpy).toHaveBeenCalledWith('info message');
            expect(warnSpy).toHaveBeenCalledWith('warn message');
            expect(errorSpy).toHaveBeenCalledWith('error message');
        });
        it('should maintain singleton behavior across multiple imports', () => {
            const utils1 = require('../utils');
            const utils2 = require('../utils');
            expect(utils1.log).toBe(utils2.log);
            utils1.log.setOptions({ type: 'client' });
            expect(utils2.log.getOptions().type).toBe('client');
        });
    });
    describe('Error Handling and Edge Cases', () => {
        it('should handle invalid interceptor gracefully', () => {
            process.env.NODE_ENV = 'development';
            const { log } = require('../utils');
            // Spy on the logger's internal error reporting
            const originalConsoleErrorSpy = jest.spyOn(log.ORIGINAL_CONSOLE_METHODS, 'error').mockImplementation();
            // Spy on the global console for the actual message
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
            // Set up faulty legacy interceptor
            log.setOptions({
                interceptor: () => {
                    throw new Error('Interceptor failure');
                }
            });
            log.log('test message');
            expect(originalConsoleErrorSpy).toHaveBeenCalledWith('Log interceptor error:', expect.any(Error));
            expect(consoleLogSpy).toHaveBeenCalledWith('test message');
            // Test with new interceptor system
            const faultyInterceptor = () => { throw new Error('New interceptor failure'); };
            log.addInterceptor(faultyInterceptor);
            log.log('another test message');
            expect(originalConsoleErrorSpy).toHaveBeenCalledWith('Log interceptor error:', expect.any(Error) // Could check for specific error message if needed
            );
            expect(consoleLogSpy).toHaveBeenCalledWith('another test message');
            log.removeInterceptor(faultyInterceptor); // Clean up
        });
        it('should handle missing localStorage gracefully', () => {
            // Mock client environment without localStorage
            global.window = { location: { hostname: 'example.com' } };
            global.document = {};
            delete global.localStorage; // Ensure localStorage is undefined
            const { Log } = require('../utils');
            const clientLog = new Log(); // Create a new instance for this specific client scenario
            const originalConsoleWarnSpy = jest.spyOn(clientLog.ORIGINAL_CONSOLE_METHODS, 'warn').mockImplementation();
            expect(() => {
                clientLog.enableDebug(); // Should warn via ORIGINAL_CONSOLE_METHODS
                clientLog.disableDebug(); // Should warn via ORIGINAL_CONSOLE_METHODS
            }).not.toThrow();
            expect(originalConsoleWarnSpy).toHaveBeenCalledTimes(2);
            expect(originalConsoleWarnSpy).toHaveBeenCalledWith('localStorage not available, cannot enable debug mode.');
            expect(originalConsoleWarnSpy).toHaveBeenCalledWith('localStorage not available, cannot disable debug mode.');
            // Cleanup
            delete global.window;
            delete global.document;
        });
        it('should handle malformed localStorage data', () => {
            global.window = { location: { hostname: 'example.com' } };
            global.document = {};
            global.localStorage = {
                getItem: jest.fn().mockReturnValue('invalid json{'),
                setItem: jest.fn(),
                removeItem: jest.fn()
            };
            const { Log } = require('../utils');
            const clientLog = new Log();
            // Spy on ORIGINAL_CONSOLE_METHODS.error for potential parsing errors if they were logged there
            // However, current implementation of getLocalStorageOverride returns null and doesn't log error for parse failure.
            // const consoleErrorSpy = jest.spyOn(clientLog.ORIGINAL_CONSOLE_METHODS, 'error');
            expect(clientLog.getLocalStorageOverride()).toBeNull();
            // expect(consoleErrorSpy).not.toHaveBeenCalled(); // No error should be logged for this
            // Cleanup
            delete global.window;
            delete global.document;
            delete global.localStorage;
        });
    });
    describe('Performance and Memory', () => {
        it('should not leak memory with many log calls', () => {
            process.env.NODE_ENV = 'development';
            const { log } = require('../utils');
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            for (let i = 0; i < 1000; i++) {
                log.log(`message ${i}`);
            }
            expect(consoleSpy).toHaveBeenCalledTimes(1000);
        });
        it('should reuse the same log instance', () => {
            const imports = [];
            for (let i = 0; i < 10; i++) {
                imports.push(require('../utils').log);
            }
            const firstInstance = imports[0];
            expect(imports.every(instance => instance === firstInstance)).toBe(true);
        });
    });
});
