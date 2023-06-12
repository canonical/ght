import defaults from "./defaults";
import { joinURL } from "../utils/pageUtils";
import { join } from "path";
import { homedir } from "os";

type Overrides = {
    greenhouseUrl?: string;
    copyFromBoard?: string;
    copyToBoard?: string;
    testJobBoard?: string;
    protectedJobBoards?: string[];
    regions?: { [key: string]: string[] };
};
class Config {
    /**
     * Greenhouse instance URL
     */
    public greenhouseUrl: string;

    /**
     * Name of the job board to post to
     */
    public copyToBoard: string;

    /**
     * Name of the job board to copy from
     */
    public copyFromBoard: string;

    /**
     * List of job boards that should not be posted to
     */
    public protectedJobBoards: string[];

    /**
     * List of attributes to filter out from the job post
     * to prevent unwanted behavior
     */
    public filteredAttributes: string[];

    /**
     * Regions and their respective cities
     */
    public regions: { [key: string]: string[] };

    constructor(overrides: Overrides = {}) {
        this.validateOverrides(overrides);

        const config = { ...defaults, ...overrides };

        this.greenhouseUrl = config.greenhouseUrl;
        this.copyFromBoard = config.copyFromBoard;
        this.copyToBoard = config.copyToBoard;
        this.protectedJobBoards = config.protectedJobBoards;
        this.regions = config.regions;
        this.filteredAttributes = config.filteredAttributes;
    }

    /**
     * Check that overrides does not have any unexpected keys
     */
    private validateOverrides(overrides: Overrides) {
        const expectedKeys = [
            "greenhouseUrl",
            "copyFromBoard",
            "copyToBoard",
            "testJobBoard",
            "protectedJobBoards",
            "regions",
        ];
        for (const key of Object.keys(overrides)) {
            if (!expectedKeys.includes(key)) {
                throw new Error(`Unexpected ${key} in overrides`);
            }
        }
    }

    isCanonical(): boolean {
        return this.greenhouseUrl === defaults.greenhouseUrl;
    }

    /**
     * File path to the authentication settings file
     */
    get userSettingsPath() {
        return join(
            homedir(),
            this.isCanonical()
                ? ".canonical-greenhouse.json"
                : ".ght-greenhouse.json"
        );
    }

    /**
     * Region names
     */
    get regionNames(): string[] {
        return Object.keys(this.regions);
    }

    /**
     * Authorization URL
     */
    get loginUrl(): string {
        return this.isCanonical()
            ? defaults.authUrl
            : joinURL(this.greenhouseUrl, "/users/sign_in");
    }

    /**
     * Name of the test job board to post to
     */
    get testJobBoard(): string {
        return this.isCanonical() ? defaults.testJobBoard : this.copyToBoard;
    }
}

export default Config;
