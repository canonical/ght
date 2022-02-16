import { JobInfo } from "./common/types";
import regions from "./common/regions";
import Job from "./automations/Job";
import SSO from "./automations/SSO";
import { Command, Argument, Option } from "commander";
import { red } from "colors";
import ora from "ora";
// @ts-ignore This can be deleted after https://github.com/enquirer/enquirer/issues/135 is fixed.
import { Select } from "enquirer";

async function getJobFromCLI(job: Job, message: string, spinner: ora.Ora) {
    // display UI
    const jobs = await job.getJobs();

    spinner.succeed();
    const prompt = new Select({
        name: "Job",
        message,
        choices: [...jobs.keys()],
    });

    const jobName = await prompt.run();
    return jobs.get(jobName);
}

async function addPosts(
    isInteractive: boolean,
    jobID: number,
    regions: string[],
    cloneFrom: number
) {
    const sso = new SSO();
    const { browser, page } = await sso.authenticate();
    const job = new Job(page);
    const spinner = ora("Fetching your jobs.").start();

    try {
        if (isInteractive) {
            const id = await getJobFromCLI(
                job,
                "What job would you like to create job posts for?",
                spinner
            );
            console.log(`Job ID: ${id}`);
            // TODO add posts
        } else {
            if (!jobID) throw Error(`Job ID argument is missing.`);
            if (!regions) throw Error(`Region parameter is missing.`);
            const jobData: JobInfo = await job.getJobData(jobID);

            // Process updates for each 'Canonical' job unless a "clone-from" argument is passed
            await job.clonePost(jobData.posts, regions, cloneFrom);
            // Mark all newly added job posts as live
            await job.markAsLive(jobID, jobData.posts);
        }
    } catch (error) {
        spinner.stop();
        console.log(`${red("x")} ${(<Error>error).message}`);
    } finally {
        browser.close();
    }
}

async function deletePosts(
    isInteractive: boolean,
    jobID: number,
    regions: string[],
    similar: number
) {
    const sso = new SSO();
    const { browser, page } = await sso.authenticate();
    const job = new Job(page);
    const spinner = ora("Fetching your jobs.").start();

    try {
        if (isInteractive) {
            const id = await getJobFromCLI(
                job,
                "What job would you like to delete job posts from?",
                spinner
            );
            console.log(`Job ID: ${id}`);
            // TODO delete posts
        } else {
            if (!jobID) throw Error(`Job ID argument is missing.`);
            await job.deletePosts(jobID, regions, similar);
        }
    } catch (error) {
        spinner.stop();
        console.log(`${red("x")} ${(<Error>error).message}`);
    } finally {
        browser.close();
    }
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
                .argOptional()
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
        .addOption(
            new Option(
                "-r, --regions <region-name>",
                "Add job posts to given region/s"
            ).argParser(validateRegionParam)
        )
        .addOption(
            new Option("-i, --interactive", "Enable interactive interface")
        )
        .action(async (jobID, options) => {
            await addPosts(
                options.interactive,
                jobID,
                options.regions,
                options.cloneFrom
            );
        });

    program
        .command("delete-posts")
        .addArgument(
            new Argument("<job-id>", "Delete job posts of the given job")
                .argOptional()
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
        .addOption(
            new Option("-i, --interactive", "Enable interactive interface")
        )
        .action(async (jobID, options) => {
            await deletePosts(
                options.interactive,
                jobID,
                options.regions,
                options.similar
            );
        });

    await program.parseAsync(process.argv);
}

main();
