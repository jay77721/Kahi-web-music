import { test as base, expect } from '@playwright/test';

// Extend Playwright's base test with custom helpers
export const test = base.extend({});

export { expect };
