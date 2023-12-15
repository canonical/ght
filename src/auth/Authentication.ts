import Config from "../config/Config";
import { Page } from "puppeteer";
import { Ora } from "ora";
import { existsSync, readFileSync, unlinkSync } from "fs";

export type LoginCookie = {
    name: string;
    value: string;
    domain: string;
};

export abstract class Authentication {
    protected spinner: Ora;
    protected config: Config;

    constructor(spinner: Ora, config: Config) {
        this.spinner = spinner;
        this.config = config;
    }

    protected parseUserSettings() {
        const configRawContent = readFileSync(
            this.config.userSettingsPath,
        ).toString();
        try {
            return JSON.parse(configRawContent);
        } catch {
            throw new Error(
                "Failed to parse user settings in " +
                    this.config.userSettingsPath,
            );
        }
    }

    logout() {
        this.spinner.start("Logging out...");
        if (existsSync(this.config.userSettingsPath)) {
            unlinkSync(this.config.userSettingsPath);
            this.spinner.succeed("Logout completed.");
        } else {
            this.spinner.succeed("Already logged out.");
        }
    }

    abstract login(page: Page): Promise<LoginCookie>;
    abstract authenticate(page: Page): any;
}
