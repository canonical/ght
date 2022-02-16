import { JobInfo } from "./common/types";
import regions from "./common/regions";
import Job from "./automations/Job";
import SSO from "./automations/SSO";
import { Command, Argument, Option } from "commander";
import { red } from "colors";
import ora from "ora";
// @ts-ignore This can be deleted after https://github.com/enquirer/enquirer/issues/135 is fixed.
import { Select } from "enquirer";

async function getJobInteractive(job: Job, message: string, spinner: ora.Ora) {
    // display UI
    const jobs = await job.getJobs();
    spinner.succeed();
    if (jobs.size === 0)
        throw Error(
            "Only hiring leads can create job posts. If you are not sure about your hiring role please contact HR."
        );

    const prompt = new Select({
        name: "Job",
        message,
        choices: [...jobs.keys()],
    });

    const jobName = await prompt.run();
    return {
        name: jobName, 
        id: jobs.get(jobName)
    };
}

async function getJobPostFromCLI(jobName: string, jobID: number, job: Job, spinner: ora.Ora) {
    spinner.start(`Fetching job posts for ${jobName}.`);
    const jobData: JobInfo = await job.getJobData(jobID);
    const uniqueNames = new Set(jobData.posts.map(post => post.name));
    spinner.stop();
    const prompt = new Select({
        name: "Job Post",
        message: "What job post should be copied?",
        choices: [...uniqueNames],
    });
    const jobPostName = await prompt.run();
    // Get one of job posts whose name matches with the chosen name. It doesn not matter which one. 
    const matchedJobPost = jobData.posts.find(post => post.name === jobPostName);
    if (!matchedJobPost) throw Error(`No job post found with given name.`);

    return {
        jobPostID: matchedJobPost.id,
        jobPostName: matchedJobPost.name
    };
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
    const spinner = ora();

    try {
        if (isInteractive) {
            spinner.start("Fetching your jobs.");
            const {name, id} = await getJobInteractive(
                job,
                "What job would you like to create job posts for?",
                spinner
            );

            if (!id) throw Error(`Job ID cannot be found.`);
            const {jobPostName, jobPostID} = await getJobPostFromCLI(name, id, job, spinner);
            console.log(`Job post name: ${jobPostName}, Job post ID: ${jobPostID}`);
            
        } else {
            if (!jobID) throw Error(`Job ID argument is missing.`);
            if (!regions) throw Error(`Region parameter is missing.`);

            spinner.start("Fetching your jobs.");
            const jobData: JobInfo = await job.getJobData(jobID);
            spinner.succeed();

            spinner.start("Cloning the posts.");
            // Process updates for each 'Canonical' job unless a "clone-from" argument is passed
            await job.clonePost(jobData.posts, regions, cloneFrom);
            spinner.succeed();

            spinner.start("Marking posts as live.");
            // Mark all newly added job posts as live
            await job.markAsLive(jobID, jobData.posts);
            spinner.succeed();
        }
    } catch (error) {
        console.log(`${red("x")} ${(<Error>error).message}`);
    } finally {
        spinner.stop();
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
    const spinner = ora();

    try {
        if (isInteractive) {
            spinner.start("Fetching your jobs.");
            const id = await getJobInteractive(
                job,
                "What job would you like to delete job posts from?",
                spinner
            );
            console.log(`Job ID: ${id}`);
        } else {
            if (!jobID) throw Error(`Job ID argument is missing.`);

            spinner.start("Deleting job posts.");
            await job.deletePosts(jobID, regions, similar);
            spinner.succeed();
        }
    } catch (error) {
        console.log(`${red("x")} ${(<Error>error).message}`);
    } finally {
        spinner.stop();
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
