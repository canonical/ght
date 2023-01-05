import type { Config } from "@jest/types";

export default async (): Promise<Config.InitialOptions> => {
    return {
        // automock: true,
        clearMocks: true,
        collectCoverage: true,
        coverageDirectory: "coverage",
        coveragePathIgnorePatterns: ["/node_modules/"],
        coverageProvider: "v8",
        coverageReporters: ["json", "text", "lcov", "clover"],
        detectOpenHandles: true,
        forceExit: true,
        globalTeardown: "./jest-globals-teardown.ts",
        preset: "ts-jest",
        setupFilesAfterEnv: ["./jest.setup.ts"],
        // testEnvironment: "jsdom",
        testEnvironment: "node",
        testMatch: ["**/**/*.test.ts"],
        transform: { "^.+\\.tsx?$": "ts-jest" },
    };
};

// module.exports = {
//     clearMocks: true,
//     coverageDirectory: "coverage",
//     coveragePathIgnorePatterns: ["/node_modules/"],
//     coverageProvider: "v8",
//     coverageReporters: ["json", "text", "lcov", "clover"],
//     setupFilesAfterEnv: ["./jest.setup.js"],
//     testEnvironment: "jsdom",
//     transform: {
//         "\\.[jt]sx?$": "babel-jest",
//     },
//     transformIgnorePatterns: ["/node_modules/(?!nanoid)"],
// };
