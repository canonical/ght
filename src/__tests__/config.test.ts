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
});
