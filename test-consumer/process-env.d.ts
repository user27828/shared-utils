export {};

/**
 * A typed view of process.env where certain keys have been parsed from JSON.
 */
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: any; // Allow any key/values even if not specified here
      DOTENV_TEST_VALUE: string;
      DOTENV_TEST_JSON: string;
      DOTENV_TEST_BOOL: boolean;
    }
  }
}
