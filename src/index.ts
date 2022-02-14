import { JobInfo } from "./common/types";
import regions from "./common/regions";
import Job from "./automations/Job";
import { authenticate } from "./common/pageUtils";
import { Command, Argument, Option } from "commander";

async function addPosts(jobID: number, regions: string[], cloneFrom: number) {
    const { browser, page } = await authenticate();
    const job = new Job(page);
    const jobData: JobInfo = await job.getJobData(jobID);

    // Process updates for each 'Canonical' job unless a "clone-from" argument is passed
    await job.clonePost(jobData.posts, regions, cloneFrom);

    // Mark all newly added job posts as live
    await job.markAsLive(jobID, jobData.posts);

    browser.close();
}

async function deletePosts(jobID: number, regions: string[], similar: number) {
    const { browser, page } = await authenticate();
    const job = new Job(page);
    await job.deletePosts(jobID, regions, similar);
    browser.close();
}

async function main() {
    const program = new Command();
    const validateNumberParam = (param: string, fieldName: string) => {
        const intValue = parseInt(param);
        if (isNaN(intValue)) throw new Error(`${fieldName} must be a number`);
        return intValue;
    };

    const validateRegionParam = (param: string) => {
        const enteredRegions: string[] = [
            ...new Set(param.split(",").map((value) => value.trim())),
        ];
        enteredRegions.forEach((enteredRegion) => {
            if (!regions[enteredRegion]) throw new Error(`Invalid region.`);
        });

        return enteredRegions;
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
            validateRegionParam
        )
        .action(async (jobID, options) => {
            addPosts(jobID, options.regions, options.cloneFrom);
        });

    program
        .command("delete-posts")
        .addArgument(
            new Argument("<job-id>", "Delete job posts of the given job")
                .argRequired()
                .argParser((value: string) =>
                    validateNumberParam(value, "job-id")
                )
        )
        .addOption(
            new Option(
                "-s, --similar <job-post-id>",
                "Delete job posts that have same name with the given post"
            ).argParser((value) => validateNumberParam(value, "post-id"))
        )
        .addOption(
            new Option(
                "-r, --regions <region-name>",
                "Delete job posts that are in the given region"
            ).argParser(validateRegionParam)
        )
        .action(async (jobID, options) => {
            deletePosts(jobID, options.regions, options.similar);
        });
    await program.parseAsync(process.argv);
}

main();
