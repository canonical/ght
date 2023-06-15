import { testHTML } from "./mocks";
import SSO from "../auth/UbuntuSSO";
import { UserError } from "../utils/processUtils";
import * as cookies from "tough-cookie";
import Enquirer = require("enquirer");
import Config from "../config/Config";

const config = new Config();

jest.mock("tough-cookie", () => jest.fn());
jest.mock(
    "node-fetch",
    () =>
        jest.fn(() =>
            Promise.resolve({
                text: () => Promise.resolve(testHTML),
            })
        ) as jest.Mock
);
jest.mock("enquirer");
jest.mock("fs");
jest.mock("tough-cookie", () => {
    return {
        CookieJar: jest.fn().mockImplementation(() => {
            return {
                setCookie: jest.fn(),
                getCookies: jest
                    .fn()
                    .mockReturnValue([{ key: "sessionid", value: "test" }]),
            };
        }),
    };
});

describe("SSO tests", () => {
    let spinner: any;

    beforeEach(() => {
        spinner = {
            start: jest.fn(),
            succeed: jest.fn(),
            stop: jest.fn(),
        } as any;

        Enquirer.prompt = jest.fn().mockResolvedValue({
            email: "test@test.com",
            password: "test",
            authCode: "test-auth",
        });
    });

    it("logs in with saved credentials", async () => {
        const sso = new SSO(spinner, config);

        await sso.login();

        expect(spinner.start).toHaveBeenLastCalledWith(
            "Checking authentication..."
        );
        expect(spinner.succeed).toHaveBeenCalledWith(
            "Using the saved credentials."
        );
    });

    it("displays invalid 2FA", async () => {
        jest.spyOn(cookies, "CookieJar").mockImplementation((): any => {
            return {
                setCookie: jest.fn(),
                getCookies: jest.fn().mockReturnValue([]),
            };
        });

        const sso = new SSO(spinner, config);

        try {
            await sso.login();
        } catch (error) {
            expect(error).toEqual(new UserError("Invalid 2FA"));
        }
        expect(spinner.start).toHaveBeenLastCalledWith("Logging in...");
    });
});
