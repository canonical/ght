import { Authentication, LoginCookie } from "./Authentication";
import { UserError } from "../utils/processUtils";
import Config from "../config/Config";
import Enquirer = require("enquirer");
import { Page } from "puppeteer";
import { Ora } from "ora";
import fs, { writeFileSync } from "fs";

type SessionCookie = {
    name: string;
    value: string;
    domain: string;
};

type Credentials = {
    email?: string;
    password?: string;
    authCode?: string;
};

/**
 * Alternative implementation of the UbuntuSSO authentication method,
 * using Puppeteer to go through the login flow instead of node-fetch.
 */
export default class NewUbuntuSSO extends Authentication {
    static SESSION_NAME = "sessionid";

    constructor(spinner: Ora, config: Config) {
        super(spinner, config);
    }

    private async loadSession() {
        if (!fs.existsSync(this.config.userSettingsPath)) return;
        return this.parseUserSettings();
    }

    private async isLoggedIn(page) {
        await page.goto(this.config.loginUrl);
        const content = await page.content();
        return /personal details/i.test(content);
    }

    private async getSessionId(page: Page): Promise<string | undefined> {
        const cookies = await page.cookies();
        return cookies.find(
            (cookie) => cookie.name === NewUbuntuSSO.SESSION_NAME,
        )?.value;
    }

    private saveUserSettings(session: SessionCookie) {
        writeFileSync(this.config.userSettingsPath, JSON.stringify(session));
    }

    private prompt(): Promise<Credentials> {
        return Enquirer.prompt([
            {
                type: "input",
                name: "email",
                message: "Your Ubuntu One email:",
            },
            {
                type: "password",
                name: "password",
                message: "Your password:",
            },
            {
                type: "input",
                name: "authCode",
                message: "2FA authentication code:",
            },
        ]);
    }

    public async login(page: Page): Promise<LoginCookie> {
        this.spinner.start("Checking authentication...");
        // Check if saved session is still valid
        let session;
        try {
            session = await this.loadSession();
            if (session) {
                await page.setCookie(session);
                if (await this.isLoggedIn(page)) {
                    this.spinner.succeed("Using the saved credentials.");
                    return session;
                }
            }
        } catch {
            // If the session is invalid, we continue with the login flow
            // This may happen if user settings were saved using the other
            // UbuntuSSO implementation
        }
        this.spinner.stop();

        let credentials: Credentials;
        try {
            credentials = await this.prompt();
        } catch {
            throw new UserError("Interrupted");
        }
        this.spinner.start("Logging in...");

        // Go to the login page
        await page.goto(this.config.loginUrl);

        // Close cookies policy so it doesn't block the login button
        await page.click("#cookie-policy-button-accept");

        // Type email
        await page.waitForSelector("input[type='email']");
        await page.type("input[type='email']", credentials.email);

        // Type password
        await page.type("input[type='password']", credentials.password);

        // Click login
        await page.click("button[type='submit']");

        // Wait for 2FA
        await page.waitForSelector("input[name='oath_token']");

        // Type 2FA
        await page.type("input[name='oath_token']", credentials.authCode);

        // Click login
        await page.click("button[type='submit']");

        const isLoggedIn = await this.isLoggedIn(page);
        const sessionId = await this.getSessionId(page);
        if (!isLoggedIn || !sessionId) throw new UserError("Invalid 2FA");

        session = {
            name: NewUbuntuSSO.SESSION_NAME,
            value: sessionId,
            domain: new URL(this.config.loginUrl).hostname,
        };
        this.saveUserSettings(session);
        this.spinner.succeed("Authentication completed.");

        return session;
    }

    public async authenticate(page: Page) {
        const loginCookie = await this.login(page);
        this.spinner.start("Setting up...");
        await page.setCookie(loginCookie);

        this.spinner.succeed("Setup is completed.");
    }
}
