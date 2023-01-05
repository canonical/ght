import { testHTML } from "./mocks";
import SSO from "../automations/SSO";
import * as error from "../common/UserError";
import Enquirer from "enquirer";
import * as cookies from "tough-cookie";

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

it("logs in with saved credentials", async () => {
    const spinner = {
        start: jest.fn(),
        succeed: jest.fn(),
        stop: jest.fn(),
    } as any;

    Enquirer.prompt = jest.fn().mockResolvedValue({
        email: "test@test.com",
        password: "test",
        authCode: "test-auth",
    });

    const sso = new SSO(spinner);

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
    jest.spyOn(error, "default").mockReturnValueOnce(jest.fn() as any);

    const spinner = {
        start: jest.fn(),
        succeed: jest.fn(),
        stop: jest.fn(),
    } as any;

    Enquirer.prompt = jest.fn().mockResolvedValue({
        email: "test@test.com",
        password: "test",
        authCode: "test-auth",
    });

    const sso = new SSO(spinner);
    await sso.login();

    expect(error.default).toHaveBeenCalled();
});
