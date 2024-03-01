import { Authentication, LoginCookie } from "./Authentication";
import { UserError } from "../utils/processUtils";
import Config from "../config/Config";
import Enquirer = require("enquirer");
import * as Puppeteer from "puppeteer";
import { Ora } from "ora";
import { CookieJar } from "tough-cookie";
import { existsSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

export default class NewUbuntuSSO extends Authentication {

    private jar: CookieJar;

    static SESSION_NAME = "sessionid";

    constructor(spinner: Ora, config: Config) {
        super(spinner, config);

        if (existsSync(config.userSettingsPath)) {
            this.jar = CookieJar.deserializeSync(this.parseUserSettings());
        } else {
            this.jar = new CookieJar();
            this.jar.setCookie(
                "_cookies_accepted=all",
                "https://login.ubuntu.com/",
            );
        }
        this.spinner = spinner;
    }

    private async currentSessionId(): Promise<string | null> {
        const cookies = await this.jar.getCookies(this.config.loginUrl);
        return (
            cookies.find((cookie) => cookie.key === NewUbuntuSSO.SESSION_NAME)
                ?.value || null
        );
    }

    private saveUserSettings() {
        const confDir = dirname(this.config.userSettingsPath);
        if (!existsSync(confDir)) {
            mkdirSync(confDir, { recursive: true });
        }
        writeFileSync(this.config.userSettingsPath, JSON.stringify(this.jar));
    }

    public async login(page: Puppeteer.Page): Promise<LoginCookie> {
        this.spinner.start("Checking authentication...");
        let sessionId = await this.currentSessionId();
        if ((await this.isLoggedIn(page)) && sessionId) {
            this.spinner.succeed("Using the saved credentials.");
            return {
                name: NewUbuntuSSO.SESSION_NAME,
                value: sessionId,
                domain: new URL(this.config.loginUrl).hostname,
            };
        }
        this.spinner.stop();
        interface Credentials {
            email?: string;
            password?: string;
            authCode?: string;
        }
        let credentials: Credentials;
        try {
            credentials = await this.prompt();
        } catch {
            throw new UserError("Interrupted");
        }
        this.spinner.start("Logging in...");
        
        // Go to the login page
        await page.goto(this.config.loginUrl);

        // Type email 
        await page.waitForSelector("input[type='email']");
        await page.type("input[type='email']", credentials.email);
        
        // Type password
        await page.type("input[type='password']", credentials.password);

        // Close cookies policy 
        await page.click("#cookie-policy-button-accept");

        // Click login
        await page.click("button[type='submit']");

        // Wait for 2FA
        await page.waitForSelector("input[name='oath_token']");

        // Type 2FA
        await page.type("input[name='oath_token']", credentials.authCode);

        // Click login
        await page.click("button[type='submit']");

        // make sure that the login flow finished successfully
        sessionId = await this.currentSessionId();
        if (!(await this.isLoggedIn(page)) || !sessionId)
            throw new UserError("Invalid 2FA");

        this.saveUserSettings();
        this.spinner.succeed("Authentication completed.");
        return {
            name: NewUbuntuSSO.SESSION_NAME,
            value: sessionId,
            domain: new URL(this.config.loginUrl).hostname,
        };
    }

    public async isLoggedIn(page) {
        const content = await page.content();
        return content.match(/personal details/i);
    }

    private prompt(): Promise<{
        email: string;
        password: string;
        authCode: string;
    }> {
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

    public async authenticate(page: Puppeteer.Page) {
        const loginCookie = await this.login(page);
        this.spinner.start("Setting up...");
        await page.setCookie(loginCookie);

        this.spinner.succeed("Setup is completed.");
    }
}
