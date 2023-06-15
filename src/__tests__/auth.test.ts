import Config from "../config/Config";
import { GreenhouseAuth } from "../auth";
import fs from "fs";

jest.mock("fs");

describe("GreenhouseAuth", () => {
    it("loads session if it exists", async () => {
        const fileContent =
            '{"name": "sessionid", "value": "1234", "domain": "example.com"}';
        jest.spyOn(fs, "readFileSync").mockReturnValue(fileContent);
        jest.spyOn(fs, "existsSync").mockReturnValue(true);
        const spinner = {
            start: jest.fn(),
            succeed: jest.fn(),
            info: jest.fn(),
        };
        const config = new Config();
        const page = {
            setCookie: jest.fn(),
            goto: jest.fn(),
            url: jest.fn().mockReturnValue(config.greenhouseUrl + "/dashboard"),
        };
        const auth = new GreenhouseAuth(spinner as any, config);

        const cookie = await auth.login(page as any);

        expect(cookie).toEqual(JSON.parse(fileContent));
    });
});
