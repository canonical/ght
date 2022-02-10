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
        page: Puppeteer.Page,
        sourceID: number
    ) {
        let protectedPosts: PostInfo[];

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
        const boards = await this.board.getBoards();
        const boardToPost = boards.find((board) => board.name === JOB_BOARD);
        if (!boardToPost) throw new Error(`Board cannot be found!.`);

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

        console.log(green("✓"), "Job posts are created.");
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
        console.log(green("✓"), "Posts are marked as live.");
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
        if (!pageElements) throw new Error("Page information cannot be found");

        const pageLength = pageElements.length ? pageElements.length - 1 : 0;
        const pageCount = parseInt(
            await getInnerText(pageElements[pageLength])
        );

        for (let currentPage = 1; currentPage <= pageCount; currentPage++) {
            await this.page.goto(`${jobappURL}?page=${currentPage}`);
            job.posts.push(...(await this.getJobPosts(job)));
        }

        return job;
    }

    public async deletePosts(jobData: JobInfo) {
        const jobID = jobData.id;
        const referrer = joinURL(MAIN_URL, `/plans/${jobID}/jobapp`);
        const posts: PostInfo[] = jobData.posts;

        for (const post of posts) {
            const jobPostID = post.id;
            const isProtected = !!PROTECTED_JOB_BOARDS.find(
                (protectedBoardName) =>
                    protectedBoardName.match(
                        new RegExp(post.boardInfo.name, "i")
                    )
            );

            // if job is protected, do not delete it.
            if (isProtected) continue;

            post.isLive && (await this.jobPost.setStatus(post, "offline"));
            await this.jobPost.deletePost(jobPostID, referrer);
            await this.page.reload();
        }

        console.log(`${green("✓")} Deleted posts of ${jobData.name}`);
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
        if (!jobAnchor) throw new Error("job name not found");
        return await getInnerText(jobAnchor);
    }
}
