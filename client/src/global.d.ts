// Global declaration for log utility
// Do NOT import { log } from any module. This is set up as a global in client/index.ts.
// This prevents VSCode from auto-importing log when used in code.
declare var log: {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
};

interface Window {
  log: typeof log;
}
