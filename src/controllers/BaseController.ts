import Config from "../config/Config";
import { GreenhouseAuth, UbuntuSSO, NewUbuntuSSO, Authentication } from "../auth";
import { UserError, isDevelopment } from "../utils/processUtils";
import { loadConfigFile } from "../utils/configUtils";
import ora, { Ora } from "ora";
import * as Puppeteer from "puppeteer";
import { Command } from "commander";
import { existsSync } from "fs";

export abstract class BaseController {
    /**
     * Global config
     */
    protected config: Config;

    /**
     * Spinner instance
     */
    protected spinner: Ora;

    /**
     * Authentication instance
     */
    protected auth: Authentication;

    constructor(command: Command) {
        this.spinner = ora();

        // --new is a global option
        const isNew = command.opts().new;

        // configPath is a global option
        const configPath = command.opts().config;
        this.config = this.getConfig(configPath);

        if (this.config.isCanonical()) {
            this.auth = isNew ? new NewUbuntuSSO(this.spinner, this.config) : new UbuntuSSO(this.spinner, this.config);
        } else {
            this.auth = new GreenhouseAuth(this.spinner, this.config);
        }
    }

    private getConfig(path: string | undefined) {
        let overrides = {};
        if (path && existsSync(path)) {
            overrides = loadConfigFile(path);
            this.spinner.info(`Using config file on ${path}`);
        }
        return new Config(overrides);
    }

    protected async getPuppeteer(): Promise<{
        browser: Puppeteer.Browser;
        page: Puppeteer.Page;
    }> {
        let options;
        if (isDevelopment()) {
            options = {
                headless: false,
                slowMo: 20,
                defaultViewport: null,
                args: ["--start-maximized"],
                devtools: true,
            };
        } else {
            options = {
                headless: "new",
                defaultViewport: null,
                args: ["--no-sandbox"],
            };
        }

        const browser = await Puppeteer.launch(options);
        const page = await browser.newPage();

        return {
            browser,
            page,
        };
    }

    protected validateRegionParam(param: string) {
        const enteredRegions: string[] = [
            ...new Set(param.split(",").map((value) => value.trim())),
        ];

        enteredRegions.forEach((enteredRegion) => {
            if (!this.config.regions[enteredRegion]) {
                const regionNames = this.config.regionNames.join(", ");
                throw new UserError(
                    `Invalid region, available regions are: ${regionNames}`,
                );
            }
        });

        return enteredRegions;
    }

    /**
     * Run the command
     */
    abstract run(): Promise<void>;
}
