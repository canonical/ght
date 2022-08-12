import { Config, Grader } from "./types";
import yaml from "js-yaml";
import fs from "fs";
import { homedir } from "os";
import { join } from "path";

/**
 * Load list of graders from config file
 */
export function loadConfig(): Config {
    const filePath = join(
        process.env["SNAP_REAL_HOME"] || homedir(),
        "ght-graders.yml"
    );
    const config = yaml.load(fs.readFileSync(filePath, "utf8")) as Config;

    return config;
}

/**
 * Return list of graders based on selected options
 */
export function createPool(
    config: Config,
    selectedJobs: string[],
    stage: string
) {
    const pool: Grader[] = [];
    selectedJobs.forEach((job) => {
        const activeGraders = config[job][stage].filter(
            (grader) => grader.active
        );
        activeGraders.forEach(({ name }) => {
            pool.push({ name, job });
        });
    });

    return pool;
}
