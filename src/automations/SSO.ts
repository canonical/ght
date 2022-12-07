import { CONFIG_PATH, SSO_DOMAIN, SSO_URL } from "../common/constants";
import { joinURL } from "../common/pageUtils";
import UserError from "../common/UserError";
import { HttpsCookieAgent } from "http-cookie-agent";
import { JSDOM } from "jsdom";
import fetch, { RequestInit, Response } from "node-fetch";
import { CookieJar } from "tough-cookie";
import Enquirer = require("enquirer");
import Puppeteer from "puppeteer";
import { Ora } from "ora";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs";

export type SSOCookies = {
    sessionId: string;
};

export default class SSO {
    private jar;
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
    private spinner: Ora;

    constructor(spinner: Ora) {
        if (existsSync(CONFIG_PATH)) {
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

    private parseUserSettings() {
        const configRawContent = readFileSync(CONFIG_PATH).toString();
        try {
            return JSON.parse(configRawContent);
        } catch {
            throw new Error("Failed to parse user settings in " + CONFIG_PATH);
        }
    }
    private saveUserSettings() {
        writeFileSync(CONFIG_PATH, JSON.stringify(this.jar));
    }

    public setCookies(page: Puppeteer.Page, ssoCookies: SSOCookies) {
        return page.setCookie({
            name: "sessionid",
            value: ssoCookies.sessionId,
            domain: SSO_DOMAIN,
        });
    }

    public async login(): Promise<SSOCookies> {
        this.spinner.start("Checking authentication...");
        let sessionId = await this.currentSessionId();
        if ((await this.isLoggedIn()) && sessionId) {
            this.spinner.succeed("Using the saved credentials.");
            return { sessionId: sessionId };
        }
        this.spinner.stop();
        let credentials;
        try {
            credentials = await this.prompt();
        } catch {
            throw new UserError("Interrupted");
        }
        this.spinner.start("Logging in...");
        let response: Response = await fetch(
            joinURL(SSO_URL, "/+login"),
            this.defaultFetchOptions
        );
        let CSRFToken: string = this.getCSRFToken(await response.text());
        response = await fetch(joinURL(SSO_URL, "/+login"), {
            ...this.defaultFetchOptions,
            headers: {
                ...this.headers,
                "content-type": "application/x-www-form-urlencoded",
            },
            method: "POST",
            body: `csrfmiddlewaretoken=${CSRFToken}&email=${credentials.email}&user-intentions=login&password=${credentials.password}&continue=&openid.usernamesecret=`,
        });
        const html = await response.text();
        if (!html.match(/type your verification code/i))
            throw new UserError(
                "Authorization failed. Please check your e-mail and password."
            );
        CSRFToken = this.getCSRFToken(html);
        response = await fetch(joinURL(SSO_URL, "/two_factor_auth"), {
            ...this.defaultFetchOptions,
            headers: {
                ...this.headers,
                "content-type": "application/x-www-form-urlencoded",
            },
            method: "POST",
            body: `oath_token=${credentials.authCode}&csrfmiddlewaretoken=${CSRFToken}&continue=&openid.usernamesecret=`,
        });

        // make sure that the login flow finished successfully
        sessionId = await this.currentSessionId();
        if (!(await this.isLoggedIn()) || !sessionId)
            throw new UserError("Invalid 2FA");
        this.saveUserSettings();
        this.spinner.succeed("Authentication completed.");
        return { sessionId: sessionId };
    }

    public logout() {
        this.spinner.start("Logging out...");
        if (existsSync(CONFIG_PATH)) {
            unlinkSync(CONFIG_PATH);
            this.spinner.succeed("Logout completed.");
        } else {
            this.spinner.succeed("Already logged out.");
        }
    }

    public async isLoggedIn() {
        if (!(await this.currentSessionId())) return false;
        const response = await fetch(SSO_URL, this.defaultFetchOptions);
        const html = await response.text();
        // if "Personal details" is present in the page
        // that means that we are in the user details page
        return html.match(/personal details/i);
    }

    private async currentSessionId(): Promise<string | null> {
        const cookies = await this.jar.getCookies(SSO_URL);
        return (
            cookies.find((cookie) => cookie.key === "sessionid")?.value || null
        );
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

    public async authenticate() {
        const loginCookies = await this.login();
        this.spinner.start("Setting up...");
        const browser = await Puppeteer.launch({
            headless: true,
	    defaultViewport: null,
            args: ["--no-sandbox"],
        });
        const page = await browser.newPage();
        await this.setCookies(page, loginCookies);

        this.spinner.succeed("Setup is completed.");
        return {
            browser,
            page,
        };
    }
}
