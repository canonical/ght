import { UserError } from "./processUtils";
import { runPrompt } from "./commandUtils";
import { JobInfo, PostInfo } from "../core/types";
import Job from "../core/Job";
import Config from "../config/Config";
// @ts-ignore This can be deleted after https://github.com/enquirer/enquirer/issues/135 is fixed.
import { Select, MultiSelect, Toggle } from "enquirer";
import { Ora } from "ora";

export async function getJobInteractive(
    job: Job,
    message: string,
    spinner: Ora
) {
    spinner.start("Fetching your jobs.");
    const jobs = await job.getJobs();
    spinner.succeed();

    if (jobs.size === 0)
        throw new UserError(
            "Only hiring leads can create job posts. If you are not sure about your hiring role please contact HR."
        );

    const prompt = new Select({
        name: "Job",
        message,
        choices: [...jobs.keys()],
    });

    const jobName = await runPrompt(prompt);
    return {
        name: jobName,
        id: jobs.get(jobName),
    };
}

export async function getJobPostInteractive(
    config: Config,
    posts: PostInfo[],
    message: string
) {
    // As a default, only job posts in the "Canonical" board should be displayed
    const board = config.copyFromBoard.toUpperCase();
    const uniqueNames = new Set(
        posts
            .filter((post) => post.boardInfo.name.toUpperCase() === board)
            .map((post) => post.name)
    );

    if (!uniqueNames.size)
        throw new Error(`No job post found in the Canonical board.`);

    const prompt = new Select({
        name: "Job Post",
        message,
        choices: [...uniqueNames],
    });
    const jobPostName = await runPrompt(prompt);
    // Get one of job posts whose name matches with the chosen name. It does not matter which one.
    const matchedJobPost = posts.find(
        (post) =>
            post.name === jobPostName &&
            post.boardInfo.name.toUpperCase() === board
    );
    if (!matchedJobPost)
        throw new Error(
            `No job post found with name ${jobPostName} in the ${board} board.`
        );

    return matchedJobPost.id;
}

export async function getRegionsInteractive(
    message: string,
    regionNames: string[]
) {
    const prompt = new MultiSelect({
        name: "Regions",
        message,
        choices: regionNames,
        validate: (value: string[]) => value.length > 0,
    });
    const region = await runPrompt(prompt);
    return region;
}

export async function deletePostsInteractive(
    config: Config,
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

    const shouldDelete = await runPrompt(prompt);
    if (shouldDelete) {
        await job.deletePosts(jobInfo, regionNames, similar);
    }
}
