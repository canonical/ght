import { JobInfo, PostInfo } from "./common/types";
import { regions } from "./common/regions";
import Job from "./automations/Job";
import SSO from "./automations/SSO";
import { PROTECTED_JOB_BOARDS } from "./common/constants";
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
            .filter((post) => post.boardInfo.name.toUpperCase() === board)
            .map((post) => post.name)
    );

    if (!uniqueNames.size)
        throw Error(`No job post found in the Canonical board.`);

    const prompt = new Select({
        name: "Job Post",
        message,
        choices: [...uniqueNames],
    });
    const jobPostName = await prompt.run();
    // Get one of job posts whose name matches with the chosen name. It doesn not matter which one.
    const matchedJobPost = posts.find(
        (post) =>
            post.name === jobPostName &&
            post.boardInfo.name.toUpperCase() === board
    );
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

async function deletePostsInteractive(
    job: Job,
    jobInfo: JobInfo,
    regionNames: string[],
    similar: number
) {
    const prompt = new Toggle({
        message: "Do you want to remove existing job posts?",
        enabled: "Yes",
        disabled: "No",
        initial: true,
    });

    const shouldDelete = await prompt.run();
    if (shouldDelete) {
        await job.deletePosts(jobInfo, regionNames, similar);
    }
}

async function addPosts(
    isInteractive: boolean,
    postIDArg: number,
    regionsArg: string[]
) {
    const spinner = ora();
    let currentBrowser;

    try {
        const sso = new SSO(spinner);
        const { browser, page } = await sso.authenticate();
        currentBrowser = browser;
        const job = new Job(page, spinner);

        let jobID;
        let jobInfo: JobInfo;
        let regionNames = regionsArg;
        let cloneFrom;
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
            if (!postIDArg) throw Error(`Job post ID argument is missing.`);
            if (!regionNames) throw Error(`Region parameter is missing.`);
            cloneFrom = postIDArg;

            spinner.start(`Fetching thejob information.`);
            jobID = await job.getJobIDFromPost(postIDArg);
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
        errorMessage
            ? spinner.fail(`${errorMessage}`)
            : spinner.fail("An error occurred.");
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

            const name = await job.getJobName(jobID);
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
        errorMessage
            ? spinner.fail(`${errorMessage}`)
            : spinner.fail("An error occurred.");
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
        .description(
            "Greenhouse is a command-line tool that provides helpers to automate " +
                "interactions with the Canonical Greenhouse website."
        )
        .command("replicate")
        .usage(
            "([-i | --interactive] | <job-post-id> --regions=<region-name>[, <region-name-2>...])" +
                "\n\n Examples: \n\t greenhouse replicate --interactive " +
                "\n \t greenhouse replicate 1234 --regions=emea,americas"
        )
        .description(
            "Create job post for a specific job in the specified regions from all existing " +
                "job posts in the Canonical Board"
        )
        .addArgument(
            new Argument(
                "<job-post-id>",
                "ID of a job post that will be cloned from"
            )
                .argOptional()
                .argParser((value: string) =>
                    validateNumberParam(value, "job post id")
                )
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
        .action(async (jobPostID, options) => {
            await addPosts(
                options.interactive,
                jobPostID,
                options.regions
            );
        });

    program
        .description(
            "Greenhouse is a command-line tool that provides helpers to automate " +
                "interactions with the Canonical Greenhouse website."
        )
        .command("delete-posts")
        .usage(
            "([-i | --interactive] | <job-id> --regions=<region-name>[, <region-name-2>...]" +
                " [--similar=<job-post-id>]) \n\n Examples: \n\t greenhouse delete-posts --interactive " +
                "\n\t greenhouse delete-posts 1234 --regions=emea,americas \n\t greenhouse delete-posts " +
                "1234 --regions=emea --similar=1123"
        )
        .description("Delete job posts of the given job")
        .addArgument(
            new Argument(
                "<job-id>",
                "ID of a job that job posts will be deleted from"
            )
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
