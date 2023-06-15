import Config from "../config/Config";

describe("Config", () => {
    it("uses default values when no overrides are provided", () => {
        const overrides = {};

        const config = new Config(overrides);

        expect(config.greenhouseUrl).toEqual("https://canonical.greenhouse.io");
    });

    it("uses overrides when provided", () => {
        const overrides = {
            greenhouseUrl: "https://example.com",
        };

        const config = new Config(overrides);

        expect(config.greenhouseUrl).toEqual("https://example.com");
    });

    it("throws an error when an invalid override is provided", () => {
        const overrides = {
            unknown: 123,
        };

        expect(() => new Config(overrides as any)).toThrow();
    })
});
