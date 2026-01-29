/**
 * Parse/Back4App Client Configuration
 * Initializes the Parse SDK with environment variables
 */

import Parse from 'parse/dist/parse.min.js';

// Initialize Parse with Back4App credentials
const initializeParse = (): void => {
  const appId = import.meta.env.VITE_PARSE_APP_ID;
  const jsKey = import.meta.env.VITE_PARSE_JS_KEY;
  const serverUrl = import.meta.env.VITE_PARSE_SERVER_URL;

  if (!appId || !jsKey) {
    console.error('Parse credentials not found. Check your .env file.');
    return;
  }

  Parse.initialize(appId, jsKey);
  (Parse as unknown as { serverURL: string }).serverURL = serverUrl;

};

// Test the Parse connection
export const testParseConnection = async (): Promise<boolean> => {
  try {
    // Simple query to test connection
    const TestObject = Parse.Object.extend('TestConnection');
    const query = new Parse.Query(TestObject);
    query.limit(1);
    await query.find();
    return true;
  } catch (error) {
    // Error is expected if class doesn't exist, but connection works
    if ((error as { code?: number }).code === 101) {
      // Class doesn't exist - but that means connection worked
      return true;
    }
    console.error('Parse connection test: FAILED', error);
    return false;
  }
};

// Initialize on import
initializeParse();

export default Parse;
