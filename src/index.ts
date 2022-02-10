import JobPost from "./automations/JobPost";
import SSO from "./automations/SSO";
import { Job, Post } from "./common/types";
import { JOB_BOARD, PROTECTED_JOB_BOARDS, REGIONS } from "./common/constants";
import { getBoards } from "./common/pageUtils";
import Puppeteer from "puppeteer";
import { green, yellow } from "colors";
import { Command, Argument, Option } from "commander";

async function clonePost(
    posts: Post[],
    regionsToPost: string[],
    postJobs: JobPost,
    page: Puppeteer.Page,
    sourceID: number
) {
    let protectedPosts: Post[];

    // Check if a source post is provided.
    if (sourceID) {
        protectedPosts = posts.filter((post) => post.id === sourceID);
        console.log(
            yellow("-"),
            `Posts are going to be cloned from ${sourceID}.`
        );
    } else {
        // If a source post is not provided, use posts that are in the "Canonical" board.
        protectedPosts = posts.filter(
            (post) => post.boardInfo.name === PROTECTED_JOB_BOARDS[0]
        );
    }

    if (!protectedPosts || !protectedPosts.length)
        throw new Error(`There is no post to clone.`);

    // Find board "Canonical - Jobs" to get its id. The cloned post should be posted on that board.
    const boards = await getBoards(page);
    const boardToPost = boards.find((board) => board.name === JOB_BOARD);
    if (!boardToPost) throw new Error(`Board cannot be found!.`);

    for (const protectedPost of protectedPosts) {
        const protectedJobName = protectedPost.name;

        // Get existing posts' location that have same name with the current protected job.
        const existingLocations = posts
            .filter((post) => post.name === protectedJobName)
            .map((post) => post.location);

        for (const regionName of regionsToPost) {
            const regionCities = REGIONS[regionName];

            // New posts' locations = Current region's locations - Existing locations
            const locations = regionCities.filter(
                (city) =>
                    !existingLocations.find((existingLocation) =>
                        existingLocation.match(new RegExp(city, "i"))
                    )
            );
            for (const location of locations) {
                await postJobs.duplicate(
                    protectedPost,
                    location,
                    boardToPost.id
                );
            }
        }
    }

    console.log(green("✓"), "Posts are created.");
}

async function markAsLive(postJobs: JobPost, jobID: number, oldPosts: Post[]) {
    const jobData: Job = await postJobs.getJobData(jobID);

    // Find posts that are newly added.
    const newlyAddedPosts = jobData.posts.filter(
        (post) => !oldPosts.find((oldPost) => post.id === oldPost.id)
    );

    for (const post of newlyAddedPosts) {
        await postJobs.setStatus(post, "live");
    }
    console.log(green("✓"), "Posts are marked as live.");
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
                "-p, --purge",
                "Delete job posts before creating job posts"
            )
        )
        .addOption(
            new Option(
                "-c, --clone-from <job-post-id>",
                "Clone job posts from the given post"
            ).argParser((value) => validateNumberParam(value, "post-id"))
        )
        .requiredOption(
            "--region <region-name>",
            "Add job posts to given region/s",
            (value) => {
                const enteredRegions: string[] = value.split(",");
                const regions = Object.keys(REGIONS);
                enteredRegions.forEach((enteredRegion) => {
                    if (
                        !regions.find((region) =>
                            region.match(new RegExp(enteredRegion, "i"))
                        )
                    )
                        throw new Error(
                            `Invalid region is entered: "${enteredRegion}". It must be one of the predefined regions: ${regions.reduce(
                                (str1, str2) => `${str1}, ${str2}`
                            )}`
                        );
                });

                return enteredRegions;
            }
        )
        .action(async (jobID, options) => {
            const sso = new SSO();
            const loginCookies = await sso.login();
            console.log(green("✓"), "Authentication complete");

            const browser = await Puppeteer.launch();
            const page = await browser.newPage();
            await sso.setCookies(page, loginCookies);

            const postJobs = new JobPost(page);

            let jobData: Job = await postJobs.getJobData(jobID);

            if (options.purge) {
                postJobs.deletePosts(jobData);
                jobData = await postJobs.getJobData(jobID);
            }

            // Process updates for each 'Canonical' job unless a "clone-from" argument is passed
            await clonePost(
                jobData.posts,
                options.region,
                postJobs,
                page,
                options.cloneFrom
            );

            // Mark all newly added job posts live
            await markAsLive(postJobs, jobID, jobData.posts);

            browser.close();
        });
    await program.parseAsync(process.argv);
}

main();
