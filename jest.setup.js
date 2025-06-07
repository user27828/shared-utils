// Jest setup file
// Global test configuration and mocks

// Mock localStorage for client-side tests
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock window object for client-side environment tests
const windowMock = {
  location: {
    hostname: 'localhost'
  }
};

// Make mocks available globally
global.localStorage = localStorageMock;
global.window = windowMock;

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset console mocks
  jest.restoreAllMocks();
  
  // Reset localStorage mock
  localStorageMock.getItem.mockReturnValue(null);
  
  // Reset process.env for clean tests
  delete process.env.NODE_ENV;
});
