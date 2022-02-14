import JobPost from "./JobPost";
import Board from "./Board";
import { JOB_BOARD, MAIN_URL, PROTECTED_JOB_BOARDS } from "../common/constants";
import { getInnerText, joinURL } from "../common/pageUtils";
import regions from "../common/regions";
import { JobInfo, PostInfo } from "../common/types";
import Puppeteer from "puppeteer";
import { green, yellow } from "colors";

export default class Job {
    private page: Puppeteer.Page;
    private jobPost: JobPost;
    private board: Board;

    constructor(page: Puppeteer.Page) {
        this.page = page;
        this.jobPost = new JobPost(page);
        this.board = new Board(page);
    }

    /**
     * Clone job posts of a job with given regions countires
     * @param posts job's posts
     * @param regionsToPost region list that job posts will be sent to
     * @param page current page
     * @param sourceID id of the post which will be copied.
     */
    public async clonePost(
        posts: PostInfo[],
        regionsToPost: string[],
        sourceID: number
    ) {
        let protectedPosts: PostInfo[];
        // Check if a source post is provided.
        if (sourceID) {
            protectedPosts = posts.filter((post) => post.id === sourceID);
            console.log(yellow("-"), `Clone job posts from ${sourceID}.`);
        } else {
            // If a source post is not provided, use posts that are in the "Canonical" board.
            protectedPosts = posts.filter(
                (post) => post.boardInfo.name === PROTECTED_JOB_BOARDS[0]
            );
        }

        if (!protectedPosts || !protectedPosts.length)
            throw new Error(`No post found to clone`);

        // Find board "Canonical - Jobs" to get its id. The cloned post should be posted on that board.
        const boards = await this.board.getBoards();
        const boardToPost = boards.find((board) => board.name === JOB_BOARD);
        if (!boardToPost) throw new Error(`Cannot found ${JOB_BOARD} board`);

        for (const protectedPost of protectedPosts) {
            const protectedJobName = protectedPost.name;

            // Get existing post's location that have same name with the current protected job.
            const existingLocations = posts
                .filter((post) => post.name === protectedJobName)
                .map((post) => post.location);

            for (const regionName of regionsToPost) {
                const regionCities = regions[regionName];

                // New posts' locations = Current region's locations - Existing locations
                const locations = regionCities.filter(
                    (city) =>
                        !existingLocations.find((existingLocation) =>
                            existingLocation.match(new RegExp(city, "i"))
                        )
                );
                for (const location of locations) {
                    await this.jobPost.duplicate(
                        protectedPost,
                        location,
                        boardToPost.id
                    );
                }
            }
        }

        console.log(green("✓"), "Created job posts.");
    }

    public async markAsLive(jobID: number, oldPosts: PostInfo[]) {
        const jobData: JobInfo = await this.getJobData(jobID);

        // Find posts that are newly added.
        const newlyAddedPosts = jobData.posts.filter(
            (post) => !oldPosts.find((oldPost) => post.id === oldPost.id)
        );

        for (const post of newlyAddedPosts) {
            await this.jobPost.setStatus(post, "live");
        }
        console.log(
            green("✓"),
            `Changed the status of ${jobData.name}'s posts to live.`
        );
    }

    public async getJobData(jobID: number): Promise<JobInfo> {
        const jobappURL = joinURL(MAIN_URL, `/plans/${jobID}/jobapp`);
        await this.page.goto(jobappURL);
        const jobTitle = await this.getJobName();
        const job: JobInfo = {
            name: jobTitle,
            id: jobID,
            posts: [],
        };

        const pageElements = await this.page.$$("*[aria-label*=Page]");
        const pageElementCount = pageElements.length;
        const pageCount = pageElementCount
            ? parseInt(await getInnerText(pageElements[pageElementCount - 1]))
            : 1;

        for (let currentPage = 1; currentPage <= pageCount; currentPage++) {
            await this.page.goto(`${jobappURL}?page=${currentPage}`);
            job.posts.push(...(await this.getJobPosts(job)));
        }

        return job;
    }

    public async deletePosts(
        jobID: number,
        enteredRegions: string[],
        similarPostID: number
    ) {
        const jobData = await this.getJobData(jobID);
        const posts: PostInfo[] = jobData.posts;

        let similarPost;
        if (similarPostID) {
            similarPost = jobData.posts.find(
                (post) => post.id === similarPostID
            );
            if (!similarPost) {
                throw new Error(`Post cannot be found`);
            }
        }

        const referrer = joinURL(MAIN_URL, `/plans/${jobID}/jobapp`);
        let count = 0;
        for (const post of posts) {
            const isProtected = !!PROTECTED_JOB_BOARDS.find(
                (protectedBoardName) =>
                    protectedBoardName.match(
                        new RegExp(post.boardInfo.name, "i")
                    )
            );

            const locationCheck =
                !enteredRegions ||
                !!enteredRegions.find((enteredRegion) => {
                    const filteredLocations = regions[enteredRegion].filter(
                        (location) =>
                            post.location.match(new RegExp(location, "i"))
                    );

                    return filteredLocations.length > 0;
                });

            const nameCheck = !similarPost || similarPost.name === post.name;

            // if job is protected, do not delete it.
            if (isProtected || !locationCheck || !nameCheck) continue;

            post.isLive && (await this.jobPost.setStatus(post, "offline"));
            await this.jobPost.deletePost(post, referrer);
            await this.page.reload();
            count++;
        }
        console.log(
            `${green("✓")} ${count} job posts of ${jobData.name} are deleted.`
        );
    }

    private async getJobPosts(job: JobInfo) {
        const jobPosts: PostInfo[] = [];
        const postElements = await this.page.$$(".job-application");
        if (!postElements || !postElements.length)
            throw new Error("No post found!");

        for (const postElement of postElements) {
            const jobPostData = await this.jobPost.getJobPostData(postElement);
            jobPosts.push({
                ...jobPostData,
                job,
            });
        }
        return jobPosts;
    }

    private async getJobName(): Promise<string> {
        const jobTitleElement = await this.page.$(".job-name");
        const jobAnchor = await jobTitleElement?.$("a");
        if (!jobAnchor) throw new Error("Cannot found job name");
        return await getInnerText(jobAnchor);
    }
}
