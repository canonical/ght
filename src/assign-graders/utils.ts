import { Config, Grader, Job } from "./types";
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
export function createPool(config: Config, selectedJobs: Job[], stage: string) {
    const pool: Grader[] = [];
    selectedJobs.forEach(({ jobName }) => {
        const activeGraders = config[jobName][stage].filter(
            (grader) => grader.active
        );
        activeGraders.forEach(({ name }) => {
            pool.push({ name, jobName });
        });
    });

    return pool;
}
