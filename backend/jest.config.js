module.exports = {
    testEnvironment: 'node',
    verbose: true,
    setupFilesAfterEnv: ['./tests/setup.js'],
    testTimeout: 30000,
    collectCoverage: true,
    coverageReporters: ['json', 'lcov', 'clover'], // Removed 'text' to hide the table
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/config/',
        '/tests/'
    ]
};
