import SSO from "./automations/SSO";
import { JobInfo } from "./common/types";
import regions from "./common/regions";
import Job from "./automations/Job";
import Puppeteer from "puppeteer";
import { green } from "colors";
import { Command, Argument, Option } from "commander";

async function addPosts(jobID: number, regions: string[], cloneFrom: number) {
    const sso = new SSO();
    const loginCookies = await sso.login();
    console.log(green("✓"), "Authentication complete");

    const browser = await Puppeteer.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await sso.setCookies(page, loginCookies);

    const job = new Job(page);
    const jobData: JobInfo = await job.getJobData(jobID);

    // Process updates for each 'Canonical' job unless a "clone-from" argument is passed
    await job.clonePost(jobData.posts, regions, cloneFrom);

    // Mark all newly added job posts as live
    await job.markAsLive(jobID, jobData.posts);

    browser.close();
}

async function main() {
    const program = new Command();

    const validateNumberParam = (param: string, fieldName: string) => {
        const intValue = parseInt(param);
        if (isNaN(intValue)) throw new Error(`${fieldName} must be a number`);
        return intValue;
    };

    program
        .command("add-post")
        .addArgument(
            new Argument("<job-id>", "job to add job posts to")
                .argRequired()
                .argParser((value: string) =>
                    validateNumberParam(value, "job-id")
                )
        )
        .addOption(
            new Option(
                "-c, --clone-from <job-post-id>",
                "Clone job posts from the given post"
            ).argParser((value) => validateNumberParam(value, "post-id"))
        )
        .requiredOption(
            "-r, --regions <region-name>",
            "Add job posts to given region/s",
            (value) => {
                const enteredRegions: string[] = [
                    ...new Set(value.split(",").map((value) => value.trim())),
                ];
                enteredRegions.forEach((enteredRegion) => {
                    if (!regions[enteredRegion])
                        throw new Error(`Invalid region.`);
                });

                return enteredRegions;
            }
        )
        .action(async (jobID, options) => {
            addPosts(jobID, options.regions, options.cloneFrom);
        });
    await program.parseAsync(process.argv);
}

main();
