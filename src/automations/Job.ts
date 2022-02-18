import JobPost from "./JobPost";
import Board from "./Board";
import {
    JOB_BOARD,
    MAIN_URL,
    PROTECTED_JOB_BOARDS,
    RECUITER,
} from "../common/constants";
import { getIDFromURL, getInnerText, joinURL } from "../common/pageUtils";
import regions from "../common/regions";
import { JobInfo, PostInfo } from "../common/types";
import Puppeteer from "puppeteer";
import ora from "ora";

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
     * @param sourceID id of the post which will be copied.
     * @returns posts that are cloned from
     */
    public async clonePost(
        posts: PostInfo[],
        regionsToPost: string[],
        sourceID: number
    ) {
        const spinner = ora().start(`Starting to create job posts.`);
        let protectedPosts: PostInfo[];
        // Check if a source post is provided.
        if (sourceID) {
            protectedPosts = posts.filter((post) => post.id === sourceID);
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

        const locationsToCreate = this.filterLocationsToClone(
            protectedPosts,
            regionsToPost
        );
        const locationNumber = [...locationsToCreate.values()]
            .map((locationList) => locationList.length)
            .reduce((pValue, nValue) => pValue + nValue);
        const totalJobsToBeCloned = protectedPosts.length * locationNumber;
        let count = 1;
        for (const protectedPost of protectedPosts) {
            const locations = locationsToCreate.get(protectedPost.id);
            if (!locations)
                throw new Error(`Location cannot be found for the post.`);

            for (const location of locations) {
                await this.jobPost.duplicate(
                    protectedPost,
                    location,
                    boardToPost.id
                );
                spinner.text = `${count} of ${totalJobsToBeCloned} job posts are created.`;
                count++;
            }
        }
        spinner.stop();
        return protectedPosts;
    }

    private filterLocationsToClone(
        postList: PostInfo[],
        enteredRegions: string[]
    ): Map<number, string[]> {
        const locationsToCreate = new Map<number, string[]>();
        for (const protectedPost of postList) {
            // Get existing post's location that have same name with the current protected job.
            const existingLocations = postList
                .filter((post) => post.name === protectedPost.name)
                .map((post) => post.location);

            const postLocations = [];
            for (const regionName of enteredRegions) {
                const regionCities = regions[regionName];
                // New posts' locations = Current region's locations - Existing locations
                const locations = regionCities.filter(
                    (city) =>
                        !existingLocations.find((existingLocation) =>
                            existingLocation.match(new RegExp(city, "i"))
                        )
                );
                postLocations.push(...locations);
            }
            locationsToCreate.set(protectedPost.id, postLocations);
        }
        return locationsToCreate;
    }

    public async markAsLive(jobID: number, oldPosts: PostInfo[]) {
        const spinner = ora().start(`Starting to set job posts as live.`);
        const jobData: JobInfo = await this.getJobData(jobID);

        // Find posts that are newly added.
        let postsToMakeLive = jobData.posts.filter(
            (post) => !oldPosts.find((oldPost) => post.id === oldPost.id)
        );

        if (postsToMakeLive.length === 0)
            postsToMakeLive = jobData.posts.filter((post) => !post.isLive);

        let count = 1;
        const totalJobsToBeUpdated = postsToMakeLive.length;
        for (const post of postsToMakeLive) {
            await this.jobPost.setStatus(post, "live");
            spinner.text = `${count} of ${totalJobsToBeUpdated} job posts are set live.`;
            count++;
        }
        spinner.stop();
        return postsToMakeLive.length;
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

        const pageCount = await this.getPageCount();
        for (let currentPage = 1; currentPage <= pageCount; currentPage++) {
            await this.page.goto(`${jobappURL}?page=${currentPage}`);
            job.posts.push(...(await this.getJobPosts(job)));
        }
        return job;
    }

    private filterPostsToDelete(
        similarPostID: number,
        enteredRegions: string[],
        posts: PostInfo[]
    ) {
        let similarPost;
        if (similarPostID) {
            similarPost = posts.find((post) => post.id === similarPostID);
            if (!similarPost) {
                throw new Error(`Post cannot be found`);
            }
        }

        const postToDelete = [];
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
            if (!isProtected && locationCheck && nameCheck)
                postToDelete.push(post);
        }
        return postToDelete;
    }

    public async deletePosts(
        jobData: JobInfo,
        enteredRegions: string[],
        similarPostID: number
    ) {
        const spinner = ora().start(`Starting to delete job posts.`);
        const posts: PostInfo[] = jobData.posts;

        const postToDelete = this.filterPostsToDelete(
            similarPostID,
            enteredRegions,
            posts
        );

        const referrer = joinURL(MAIN_URL, `/plans/${jobData.id}/jobapp`);
        let count = 1;
        const totalJobsToDelete = postToDelete.length;
        for (const post of postToDelete) {
            post.isLive && (await this.jobPost.setStatus(post, "offline"));
            await this.jobPost.deletePost(post, referrer);
            await this.page.reload();

            spinner.text = `${count} of ${totalJobsToDelete} job posts were deleted.`;
            count++;
        }
        spinner.succeed(
            `${totalJobsToDelete} job posts of ${jobData.name} were deleted.`
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

    public async getJobName(): Promise<string> {
        const jobTitleElement = await this.page.$(".job-name");
        const jobAnchor = await jobTitleElement?.$("a");
        if (!jobAnchor) throw new Error("Cannot find the job's name.");
        return await getInnerText(jobAnchor);
    }

    private async getPageCount() {
        const pageElements = await this.page.$$("*[aria-label*=Page]");
        const pageElementCount = pageElements.length;
        return pageElementCount
            ? parseInt(await getInnerText(pageElements[pageElementCount - 1]))
            : 1;
    }

    private async isRecruiter(parentElement: Puppeteer.ElementHandle) {
        let isRecuiter = false;
        const tags = await parentElement.$$(".job-tag");
        for (const tag of tags) {
            const tagText = await getInnerText(tag);
            if (RECUITER === tagText.toLocaleUpperCase()) {
                isRecuiter = true;
                break;
            }
        }
        return isRecuiter;
    }

    public async getJobs() {
        const jobs = new Map<string, number>();
        const pageCount = await this.getPageCount();
        const url = joinURL(MAIN_URL, "/alljobs");
        for (let currentPage = 1; currentPage <= pageCount; currentPage++) {
            await this.page.goto(`${url}?page=${currentPage}`);
            await this.page.waitForSelector(".job");
            const jobElements = await this.page.$$(".job");

            if (!jobElements || !jobElements.length)
                throw new Error("No job found.");

            for (const jobElement of jobElements) {
                const jobNameElement = await jobElement.$(".job-label-name");
                if (!jobNameElement) throw new Error("Cannot get job name");

                const isRecuiter = await this.isRecruiter(jobElement);
                if (!isRecuiter) continue;

                const nameCell = await jobElement.$(".job-name");
                if (!nameCell) throw new Error("Cannot get job name cell.");

                const jobID = await getIDFromURL(nameCell, "a");
                const jobName = await getInnerText(jobNameElement);
                jobs.set(jobName, jobID);
            }
        }
        return jobs;
    }
}
