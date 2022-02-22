import { JobInfo, PostInfo } from "./common/types";
import regions from "./common/regions";
import Job from "./automations/Job";
import SSO from "./automations/SSO";
import { MAIN_URL, PROTECTED_JOB_BOARDS } from "./common/constants";
import { joinURL } from "./common/pageUtils";
import { ADD_POSTS_DESCRIPTION, ADD_POSTS_REGIONS_DESCRIPTION, ADD_POSTS_USAGE, CLONE_FROM_DESCRIPTION, DELETE_POSTS_DESCRIPTION, DELETE_POSTS_REGIONS_DESCRIPTION, DELETE_POSTS_USAGE, GENERAL_DESCRIPTION, INTERACTIVE_DESCRIPTION, JOB_ID_DESCRIPTION, SIMILAR_DESCRIPTION } from "./common/commandDescriptios";
import { Command, Argument, Option } from "commander";
import { green } from "colors";
import ora from "ora";
// @ts-ignore This can be deleted after https://github.com/enquirer/enquirer/issues/135 is fixed.
import { Select, MultiSelect, Toggle } from "enquirer";

async function getJobInteractive(job: Job, message: string, spinner: ora.Ora) {
    spinner.start("Fetching your jobs.");
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
        id: jobs.get(jobName),
    };
}

async function getJobPostInteractive(posts: PostInfo[], message: string) {
    // Only job posts in the "Canonical" board should be displayed
    const board = PROTECTED_JOB_BOARDS[0].toUpperCase();
    const uniqueNames = new Set(
        posts
            .filter(
                (post) =>
                    post.boardInfo.name.toUpperCase() === board 
            )
            .map((post) => post.name)
    );

    if (!uniqueNames.size) throw Error(`No job post found in the Canonical board.`);

    const prompt = new Select({
        name: "Job Post",
        message,
        choices: [...uniqueNames],
    });
    const jobPostName = await prompt.run();
    // Get one of job posts whose name matches with the chosen name. It doesn not matter which one.
    const matchedJobPost = posts.find((post) => post.name === jobPostName && post.boardInfo.name.toUpperCase() === board);
    if (!matchedJobPost) throw Error(`No job post found with given name.`);

    return matchedJobPost.id;
}

async function getRegionsInteractive(message: string) {
    const regionNames = Object.keys(regions);
    const prompt = new MultiSelect({
        name: "Regions",
        message,
        choices: regionNames,
        validate: (value: string[]) => value.length > 0,
    });
    const region = await prompt.run();
    return region;
}

async function deletePostsInteractive(job: Job, jobInfo: JobInfo, regionNames: string[], similar: number) {
    const prompt = new Toggle({
        message: "Do you want to remove existing job posts?",
        enabled: "Yes",
        disabled: "No",
        initial: true
      });
       
    const shouldDelete = await prompt.run();
    if (shouldDelete) {
        await job.deletePosts(jobInfo, regionNames, similar);
    }
}

async function addPosts(
    isInteractive: boolean,
    jobIDArg: number,
    regionsArg: string[],
    cloneFromArg: number
) {
    const spinner = ora();
    let currentBrowser;

    try {
        const sso = new SSO(spinner);
        const { browser, page } = await sso.authenticate();
        currentBrowser = browser;
        const job = new Job(page, spinner);

        let jobID = jobIDArg;
        let jobInfo: JobInfo;
        let regionNames = regionsArg;
        let cloneFrom = cloneFromArg;
        if (isInteractive) {
            const { name, id } = await getJobInteractive(
                job,
                "What job would you like to create job posts for?",
                spinner
            );
            if (!id) throw Error(`Job ID cannot be found.`);
            jobID = id;
            spinner.start(`Fetching job posts for ${name}.`);
            jobInfo = await job.getJobData(jobID);
            spinner.succeed();
            if (jobInfo.posts.length === 0)
                throw Error(
                    "Only hiring leads can create job posts. If you are not sure about your hiring role please contact HR."
                );

            const jobPostID = await getJobPostInteractive(
                jobInfo.posts,
                "What job post should be copied?"
            );
            cloneFrom = jobPostID;

            regionNames = await getRegionsInteractive(
                "What region should those job posts be? Use space to make a selection."
            );

            await deletePostsInteractive(job, jobInfo, regionNames, cloneFrom);
        } else {
            if (!jobID) throw Error(`Job ID argument is missing.`);
            if (!regionNames) throw Error(`Region parameter is missing.`);

            await page.goto(joinURL(MAIN_URL, `/plans/${jobID}`));

            const name = await job.getJobName();
            spinner.start(`Fetching job posts for ${name}.`);
            jobInfo = await job.getJobData(jobID);
            spinner.succeed();
            if (jobInfo.posts.length === 0)
                throw Error(
                    "Only hiring leads can create job posts. If you are not sure about your hiring role please contact HR."
                );
        }
        // Process updates for each 'Canonical' job unless a "clone-from" argument is passed
        const clonedJobPosts = await job.clonePost(
            jobInfo.posts,
            regionNames,
            cloneFrom
        );
        // Mark all newly added job posts as live
        const processedJobCount = await job.markAsLive(jobID, jobInfo.posts);

        console.log(
            green("✔"),
            `${processedJobCount} job posts for ${clonedJobPosts
                .map((post) => post.name)
                .reduce(
                    (previousValue, currentValue) =>
                        previousValue + ", " + currentValue
                )} of ${jobInfo.name} were created in ${regionNames}`
        );
        console.log("Happy hiring!");
    } catch (error) {
        const errorMessage = (<Error>error).message;
        errorMessage ?
            spinner.fail(`${errorMessage}`) :
            spinner.fail("An error occurred.");
    } finally {
        spinner.stop();
        currentBrowser?.close();
    }
}

async function deletePosts(
    isInteractive: boolean,
    jobIDArg: number,
    regionsArg: string[],
    similarArg: number
) {
    const spinner = ora();
    const sso = new SSO(spinner);
    let currentBrowser;

    try {
        const { browser, page } = await sso.authenticate();
        currentBrowser = browser;

        const job = new Job(page, spinner);
        let jobID = jobIDArg;
        let jobInfo: JobInfo;
        let regionNames = regionsArg;
        let similar = similarArg;

        if (isInteractive) {
            const { name, id } = await getJobInteractive(
                job,
                "What job would you like to delete job posts from?",
                spinner
            );

            if (!id) throw Error(`Job ID cannot be found.`);
            jobID = id;

            spinner.start(`Fetching job posts for ${name}.`);
            jobInfo = await job.getJobData(jobID);
            spinner.succeed();

            if (jobInfo.posts.length === 0)
                throw Error(
                    "Only hiring leads can delete job posts. If you are not sure about your hiring role please contact HR."
                );

            const jobPostID = await getJobPostInteractive(
                jobInfo.posts,
                "Which job posts should be deleted?"
            );
            similar = jobPostID;

            regionNames = await getRegionsInteractive(
                "What region should the job posts be deleted from? Use space to make a selection."
            );
        } else {
            if (!jobID) throw Error(`Job ID argument is missing.`);

            await page.goto(joinURL(MAIN_URL, `/plans/${jobID}`));
            const name = await job.getJobName();
            spinner.start(`Fetching job posts for ${name}.`);
            jobInfo = await job.getJobData(jobID);
            spinner.succeed();

            if (jobInfo.posts.length === 0)
                throw Error(
                    "Only hiring leads can delete job posts. If you are not sure about your hiring role please contact HR."
                );
        }
        await job.deletePosts(jobInfo, regionNames, similar);

        console.log("Happy hiring!");
    } catch (error) {
        const errorMessage = (<Error>error).message;
        errorMessage ?
            spinner.fail(`${errorMessage}`) :
            spinner.fail("An error occurred.")
    } finally {
        spinner.stop();
        currentBrowser?.close();
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
        .description(GENERAL_DESCRIPTION)
        .command("add-posts")
        .usage(ADD_POSTS_USAGE)
        .description(ADD_POSTS_DESCRIPTION)
        .addArgument(
            new Argument("<job-id>", JOB_ID_DESCRIPTION)
                .argOptional()
                .argParser((value: string) =>
                    validateNumberParam(value, "job-id")
                )
        )
        .addOption(
            new Option(
                "-c, --clone-from <job-post-id>",
                CLONE_FROM_DESCRIPTION
            ).argParser((value) => validateNumberParam(value, "post-id"))
        )
        .addOption(
            new Option(
                "-r, --regions <region-name>",
                ADD_POSTS_REGIONS_DESCRIPTION
            ).argParser(validateRegionParam)
        )
        .addOption(
            new Option("-i, --interactive", INTERACTIVE_DESCRIPTION)
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
        .usage(DELETE_POSTS_USAGE)
        .description(DELETE_POSTS_DESCRIPTION)
        .addArgument(
            new Argument("<job-id>", JOB_ID_DESCRIPTION)
                .argOptional()
                .argParser((value: string) =>
                    validateNumberParam(value, "job-id")
                )
        )
        .addOption(
            new Option(
                "-s, --similar <job-post-id>",
                SIMILAR_DESCRIPTION
            ).argParser((value) => validateNumberParam(value, "post-id"))
        )
        .addOption(
            new Option(
                "-r, --regions <region-name>",
                DELETE_POSTS_REGIONS_DESCRIPTION
            ).argParser(validateRegionParam)
        )
        .addOption(
            new Option("-i, --interactive", INTERACTIVE_DESCRIPTION)
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
