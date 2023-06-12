import { Authentication, LoginCookie } from "./Authentication";
import { UserError } from "../utils/processUtils";
import Config from "../config/Config";
import { joinURL } from "../utils/pageUtils";
import Enquirer = require("enquirer");
import { Ora } from "ora";
import { Page } from "puppeteer";
import fs from "fs";
import { writeFileSync } from "fs";

interface Credentials {
    email: string;
    password: string;
}

export default class GreenhouseAuth extends Authentication {
    static SESSION_NAME = "_session_id";

    constructor(spinner: Ora, config: Config) {
        super(spinner, config);
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
                message: "Your email:",
            },
            {
                type: "password",
                name: "password",
                message: "Your password:",
            },
        ]);
    }

    private async isLoggedIn(page: Page) {
        await page.goto(this.config.loginUrl);
        // If we get redirected to the dashboard, we are logged in
        return page.url() === joinURL(this.config.greenhouseUrl, "/dashboard");
    }

    /**
     * Get session from page cookies
     */
    private async getSessionId(page: Page): Promise<string | undefined> {
        const cookies = await page.cookies();
        return cookies.find(
            (cookie) => cookie.name === GreenhouseAuth.SESSION_NAME
        )?.value;
    }

    private async loadSession() {
        if (!fs.existsSync(this.config.userSettingsPath)) return;
        return this.parseUserSettings();
    }

    async login(page: Page): Promise<LoginCookie> {
        this.spinner.start("Checking authentication...");
        this.spinner.info(`Greenhouse instance: ${this.config.greenhouseUrl}`);
        // Check if saved session is still valid
        let session = await this.loadSession();
        if (session) {
            await page.setCookie(session);
            if (await this.isLoggedIn(page)) {
                this.spinner.succeed("Using the saved credentials.");
                return session;
            }
        }
        this.spinner.stop();

        // Else ask for credentials and log in
        let credentials: Credentials;
        try {
            credentials = await this.prompt();
        } catch {
            throw new UserError("Interrupted");
        }

        this.spinner.start("Logging in...");

        await page.goto(this.config.loginUrl);
        await page.waitForSelector("#user_email");
        await page.type("#user_email", credentials.email || "");
        // Click next
        await page.click("#submit_email_button");
        try {
            await page.waitForSelector("#user_password", { visible: true });
            await page.type("#user_password", credentials.password || "");
            await Promise.all([
                page.click("#submit_password_button"),
                page.waitForNavigation({ waitUntil: "domcontentloaded" }),
            ]);
        } catch (e) {
            this.spinner.stop();
            throw new UserError("Failed to login");
        }

        const sessionId = await this.getSessionId(page);
        if (!sessionId) {
            throw new UserError("Failed to login.");
        }
        this.spinner.succeed("Login completed.");

        session = {
            name: GreenhouseAuth.SESSION_NAME,
            value: sessionId,
            domain: new URL(this.config.loginUrl).hostname,
        };
        writeFileSync(this.config.userSettingsPath, JSON.stringify(session));

        return session;
    }

    async authenticate(page: Page) {
        const loginCookie = await this.login(page);
        this.spinner.start("Setting up...");
        await page.setCookie(loginCookie);
        this.spinner.succeed("Setup is completed.");
    }
}
