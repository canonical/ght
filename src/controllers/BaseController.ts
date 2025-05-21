import Config from "../config/Config";
import {
    GreenhouseAuth,
    UbuntuSSO,
    NewUbuntuSSO,
    Authentication,
} from "../auth";
import { UserError, isDevelopment } from "../utils/processUtils";
import { loadConfigFile } from "../utils/configUtils";
import { ScreenRecorder } from "../utils/screenRecorder";
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

    /**
     * Whether or not to record Puppeteer session to mp4
     */
    protected recordingEnabled: boolean;

    /**
     * Screen recorder instance
     */
    protected screenRecorder: ScreenRecorder;

    constructor(command: Command) {
        this.spinner = ora();

        // --new is a global option
        const isNew = command.opts().new;

        // configPath is a global option
        const configPath = command.opts().config;
        this.config = this.getConfig(configPath);

        // --record is a global option
        this.recordingEnabled = command.opts().record;

        let auth;
        if (this.config.isCanonical()) {
            if (isNew) {
                auth = new NewUbuntuSSO(this.spinner, this.config);
            } else {
                auth = new UbuntuSSO(this.spinner, this.config);
            }
        } else {
            auth = new GreenhouseAuth(this.spinner, this.config);
        }

        this.auth = auth;
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

        // 10 minutes navigation timeout
        page.setDefaultNavigationTimeout(10 * 60 * 1000);

        // Set a standard browser user agent to avoid anti bot protections
        if (isDevelopment) {
            page.setUserAgent(
                "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
            );
        }

        // optionally initialize screen recorder instance
        if (this.recordingEnabled) {
            this.screenRecorder = new ScreenRecorder(page);
            await this.screenRecorder.start();
        }

        // url1("/jobapps/${jobPost.id}/edit") may have a
        // beforeunload handler so accept the "Changes you made may
        // not be saved" dialog since we are not editing anything
        // but replicating the existing data only.
        page.on("dialog", dialog => {
            if (dialog.type() === "beforeunload") {
                dialog.accept();
            }
        });

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

    // method to handle stopping a recording
    public async stopRecording(): Promise<void> {
        if (this.screenRecorder && this.screenRecorder.isActive()) {
            await this.screenRecorder.stop();
        }
    }

    /**
     * Run the command
     */
    abstract run(): Promise<void>;
}
