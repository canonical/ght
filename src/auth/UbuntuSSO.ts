import { Authentication, LoginCookie } from "./Authentication";
import { joinURL } from "../utils/pageUtils";
import { UserError } from "../utils/processUtils";
import Config from "../config/Config";
import { HttpsCookieAgent } from "http-cookie-agent";
import { JSDOM } from "jsdom";
import fetch, { RequestInit, Response } from "node-fetch";
import Enquirer = require("enquirer");
import Puppeteer from "puppeteer";
import { Ora } from "ora";
import { CookieJar } from "tough-cookie";
import { existsSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

export default class UbuntuSSO extends Authentication {
    private httpsAgent;
    // the base headers that are sent to login.ubuntu.com
    private headers = {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "accept-language": "en-US,en;q=0.9,fr;q=0.8",
        "cache-control": "max-age=0",
        "sec-ch-ua":
            '" Not;A Brand";v="99", "Google Chrome";v="97", "Chromium";v="97"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Linux"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        Referer: "https://login.ubuntu.com/+login",
        "Referrer-Policy": "strict-origin-when-cross-origin",
    };
    private defaultFetchOptions: RequestInit;
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
                "https://login.ubuntu.com/"
            );
        }
        this.httpsAgent = new HttpsCookieAgent({ jar: this.jar });
        this.defaultFetchOptions = {
            agent: this.httpsAgent,
            headers: this.headers,
            method: "GET",
            redirect: "follow",
        };
        this.spinner = spinner;
    }

    private async currentSessionId(): Promise<string | null> {
        const cookies = await this.jar.getCookies(this.config.loginUrl);
        return (
            cookies.find((cookie) => cookie.key === UbuntuSSO.SESSION_NAME)
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

    public async login(): Promise<LoginCookie> {
        this.spinner.start("Checking authentication...");
        let sessionId = await this.currentSessionId();
        if ((await this.isLoggedIn()) && sessionId) {
            this.spinner.succeed("Using the saved credentials.");
            return {
                name: UbuntuSSO.SESSION_NAME,
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
        let response: Response = await fetch(
            joinURL(this.config.loginUrl, "/+login"),
            this.defaultFetchOptions
        );
        const firstResponse = await response.text();
        let CSRFToken: string = this.getCSRFToken(firstResponse);
        console.log("==================")
        console.log("DEBUG :: STEP 1")
        console.log(firstResponse)
        console.log("The token found is:", CSRFToken)
        console.log("==================")
        response = await fetch(joinURL(this.config.loginUrl, "/+login"), {
            ...this.defaultFetchOptions,
            headers: {
                ...this.headers,
                "content-type": "application/x-www-form-urlencoded",
            },
            method: "POST",
            body: `csrfmiddlewaretoken=${CSRFToken}&email=${credentials.email}&user-intentions=login&password=${credentials.password}&continue=&openid.usernamesecret=`,
        });
        const html = await response.text();
        console.log("==================")
        console.log("DEBUG :: STEP 2")
        console.log(html)
        console.log("Verification code in page?", !!html.match(/type your verification code/i))
        console.log("==================")
        if (!html.match(/type your verification code/i))
            throw new UserError(
                "Authorization failed. Please check your e-mail and password."
            );
        CSRFToken = this.getCSRFToken(html);
        response = await fetch(
            joinURL(this.config.loginUrl, "/two_factor_auth"),
            {
                ...this.defaultFetchOptions,
                headers: {
                    ...this.headers,
                    "content-type": "application/x-www-form-urlencoded",
                },
                method: "POST",
                body: `oath_token=${credentials.authCode}&csrfmiddlewaretoken=${CSRFToken}&continue=&openid.usernamesecret=`,
            }
        );

        // make sure that the login flow finished successfully
        sessionId = await this.currentSessionId();
        if (!(await this.isLoggedIn()) || !sessionId)
            throw new UserError("Invalid 2FA");
        this.saveUserSettings();
        this.spinner.succeed("Authentication completed.");
        return {
            name: UbuntuSSO.SESSION_NAME,
            value: sessionId,
            domain: new URL(this.config.loginUrl).hostname,
        };
    }

    public async isLoggedIn() {
        if (!(await this.currentSessionId())) return false;
        const response = await fetch(
            this.config.loginUrl,
            this.defaultFetchOptions
        );
        const html = await response.text();
        // if "Personal details" is present in the page
        // that means that we are in the user details page
        return html.match(/personal details/i);
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

    private getCSRFToken(html: string) {
        const {
            window: { document },
        } = new JSDOM(html);
        const csrfToken = document
            .querySelector("input[name='csrfmiddlewaretoken']")
            ?.getAttribute("value");
        if (!csrfToken) throw new Error("Failed to get the CSRF token");
        return csrfToken;
    }

    public async authenticate(page: Puppeteer.Page) {
        const loginCookie = await this.login();
        this.spinner.start("Setting up...");
        await page.setCookie(loginCookie);

        this.spinner.succeed("Setup is completed.");
    }
}
