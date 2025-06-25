"use strict";
/**
 * Simple test to verify Jest configuration
 * @jest-environment node
 */
describe('Simple Test', () => {
    it('should pass a basic test', () => {
        expect(1 + 1).toBe(2);
    });
});
