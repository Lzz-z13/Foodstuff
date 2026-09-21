module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.js"],
  setupFiles: ["<rootDir>/tests/setup/env.js"],
  globalSetup: "<rootDir>/tests/setup/globalSetup.js",
  maxWorkers: 1,
  clearMocks: true,
  verbose: true,
};