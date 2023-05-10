import JobPost from "./JobPost";
import Board from "./Board";
import {
    JOB_BOARD,
    MAIN_URL,
    PROTECTED_JOB_BOARDS,
    RECRUITER,
    TEST_JOB_BOARD,
} from "../common/constants";
import { getIDFromURL, getInnerText, joinURL } from "../common/pageUtils";
import { regions } from "../common/regions";
import { JobInfo, PostInfo } from "../common/types";
import { evaluate, isDevelopment } from "../common/processUtils";
import Puppeteer from "puppeteer";
import { Ora } from "ora";

export default class Job {
    private page: Puppeteer.Page;
    private jobPost: JobPost;
    private board: Board;
    private spinner: Ora;

    constructor(page: Puppeteer.Page, spinner: Ora) {
        this.page = page;
        this.jobPost = new JobPost(page);
        this.board = new Board(page);
        this.spinner = spinner;
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
        this.spinner.start(`Starting to create job posts.`);
        const board = PROTECTED_JOB_BOARDS[0];
        let protectedPosts: PostInfo[];
        // Check if a source post is provided.
        if (sourceID) {
            protectedPosts = posts.filter(
                (post) => post.id === sourceID && post.boardInfo.name === board
            );
        } else {
            // If a source post is not provided, use posts that are in the "Canonical" board.
            protectedPosts = posts.filter(
                (post) => post.boardInfo.name === board
            );
        }

        if (!protectedPosts?.length) {
            const errorMessage = sourceID
                ? `Job post with ${sourceID} ID cannot be found in the Canonical Board.`
                : `No post found to clone`;
            throw new Error(errorMessage);
        }

        // Find board "Canonical - Jobs" to get its id. The cloned post should be posted on that board.
        const boards = await this.board.getBoards();
        const validBoardToPost = isDevelopment() ? TEST_JOB_BOARD : JOB_BOARD;
        const boardToPost = boards.find(
            (board) => board.name === validBoardToPost
        );
        if (!boardToPost)
            throw new Error(`Cannot found ${validBoardToPost} board`);

        const cities = this.getCities(regionsToPost);
        const totalJobsToBeCloned = protectedPosts.length * cities.length;
        let count = 1;
        for (const protectedPost of protectedPosts) {
            for (const city of cities) {
                await this.jobPost.duplicate(
                    protectedPost,
                    city,
                    boardToPost.id
                );
                this.spinner.text = `${count} of ${totalJobsToBeCloned} job posts are created.`;
                count++;
            }
        }
        this.spinner.stop();
        return protectedPosts;
    }

    private getCities(enteredRegions: string[]): string[] {
        const postLocations: string[] = [];
        enteredRegions.forEach((regionName: string) => {
            postLocations.push(...regions[regionName]);
        });
        return [...new Set(postLocations)];
    }

    public async markAsLive(jobID: number, oldPosts: PostInfo[]) {
        this.spinner.start(`Starting to set job posts as live.`);
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
            this.spinner.text = `${count} of ${totalJobsToBeUpdated} job posts are set live.`;
            count++;
        }
        this.spinner.stop();
        return postsToMakeLive.length;
    }

    public async getJobData(jobID: number): Promise<JobInfo> {
        const jobTitle = await this.getJobName(jobID);
        const job: JobInfo = {
            name: jobTitle,
            id: jobID,
            posts: [],
        };

        const jobappURL = joinURL(MAIN_URL, `/plans/${jobID}/jobapp`);
        await this.page.goto(jobappURL);
        const pageCount = await this.getPageCount();
        for (let currentPage = 1; currentPage <= pageCount; currentPage++) {
            await this.page.goto(`${jobappURL}?page=${currentPage}`);
            job.posts.push(...(await this.getJobPosts(job)));
        }
        return job;
    }

    private filterPostsToDelete(
        posts: PostInfo[],
        similarPostID?: number,
        enteredRegions?: string[]
    ) {
        let similarPost;
        if (similarPostID) {
            similarPost = posts.find((post) => post.id === similarPostID);
            if (!similarPost) {
                throw new Error(
                    `Post with ${similarPostID} ID cannot be found`
                );
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
        enteredRegions?: string[],
        similarPostID?: number
    ) {
        this.spinner.start(`Starting to delete job posts.`);
        const posts: PostInfo[] = jobData.posts;

        const postToDelete = this.filterPostsToDelete(
            posts,
            similarPostID,
            enteredRegions
        );

        const referrer = joinURL(MAIN_URL, `/plans/${jobData.id}/jobapp`);
        let count = 1;
        const totalJobsToDelete = postToDelete.length;
        for (const post of postToDelete) {
            post.isLive && (await this.jobPost.setStatus(post, "offline"));
            await this.jobPost.deletePost(post, referrer);
            await this.page.reload();

            this.spinner.text = `${count} of ${totalJobsToDelete} job posts were deleted.`;
            count++;
        }
        this.spinner.succeed(
            `${totalJobsToDelete} job posts of ${jobData.name} were deleted.`
        );
    }

    private async getJobPosts(job: JobInfo) {
        const jobPosts: PostInfo[] = [];
        const postElements = await this.page.$$(".job-application");
        if (!postElements || !postElements.length)
            throw new Error(`No post found for job ${job.name}`);

        for (const postElement of postElements) {
            const jobPostData = await this.jobPost.getJobPostData(postElement);
            jobPosts.push({
                ...jobPostData,
                job,
            });
        }
        return jobPosts;
    }

    public async getJobName(jobID: number): Promise<string> {
        const url = joinURL(MAIN_URL, `/plans/${jobID}`);
        await this.page.goto(url);

        const jobTitleElement = await this.page.$(".job-name");
        const jobAnchor = await jobTitleElement?.$("a");
        if (!jobAnchor)
            throw new Error(
                `Cannot find name of the job with ${jobID} ID in the ${url} page.`
            );
        return await getInnerText(jobAnchor);
    }

    private async getPageCount() {
        const pageElements = await this.page.$$("*[aria-label*=Page]");
        const pageElementCount = pageElements.length;
        return pageElementCount
            ? parseInt(await getInnerText(pageElements[pageElementCount - 1]))
            : 1;
    }

    private async getJobsFromPage(page: number) {
        const url = joinURL(MAIN_URL, `/alljobs/list?page=${page}`);
        await this.page.goto(url);

        const body = await this.page.$("body");
        let innerHTML = await body?.evaluate((element) => element.innerHTML);
        if (!innerHTML) throw new Error(`Jobs cannot be found from ${url}`);

        // Strip HTML markup around the JSON. For example: <pre>
        innerHTML = innerHTML.replace(/(<([^>]+)>)/gi, "");

        const content = JSON.parse(decodeURIComponent(innerHTML));

        const jobs = await evaluate(
            this.page,
            ({ htmlAsStr, recruiterTag }) => {
                const domParser = new DOMParser();
                const root = domParser.parseFromString(htmlAsStr, "text/html");

                const jobElements = root.querySelectorAll("a.target");
                const jobInfo: { [jobName: string]: number } = {};
                for (const item of jobElements) {
                    if (item.getAttribute("title")) {
                        const tags = item.querySelectorAll(".job-tag.role");
                        let isRecruiter = false;
                        for (const tag of tags) {
                            const recruiterCheck = tag.innerHTML.match(
                                new RegExp(recruiterTag, "i")
                            );
                            if (recruiterCheck) {
                                isRecruiter = true;
                                break;
                            }
                        }

                        if (!isRecruiter) continue;
                        const url = item.getAttribute("href");
                        if (!url) throw new Error(`Cannot get ID from ${url}.`);
                        const urlParts: string[] = url.split("/");
                        const id = parseInt(urlParts[urlParts.length - 1]);
                        const nameElement = item.getAttribute("title");
                        if (!nameElement)
                            throw new Error(`Cannot get job name.`);

                        const matchedReqID = nameElement.match(/\([0-9]+\)/);
                        if (!matchedReqID)
                            throw new Error(`Cannot get req ID.`);
                        const matchedElement = matchedReqID[0];
                        const reqID = matchedElement.slice(
                            1,
                            matchedElement.length - 1
                        );
                        const jobName = nameElement.split(/\([0-9]+\)/)[0];
                        jobInfo[`[${reqID}] ${jobName}`] = id;
                    }
                }
                return jobInfo;
            },
            {
                htmlAsStr: content["html"],
                recruiterTag: RECRUITER,
            }
        );

        return {
            jobs,
            hasMorePage: content.pagination !== "\n",
        };
    }

    private async loadAllJobs() {
        let page = 1;
        let jobs: { [jobName: string]: number } = {};
        let retrievedJobs: { [jobName: string]: number } = {};
        let hasPage = true;

        while (hasPage) {
            const pageInformation = await this.getJobsFromPage(page);
            retrievedJobs = pageInformation.jobs;
            hasPage = pageInformation.hasMorePage;
            jobs = { ...jobs, ...retrievedJobs };
            page += 1;
        }
        return jobs;
    }

    public async getJobs() {
        const jobs = await this.loadAllJobs();
        return new Map(Object.entries(jobs));
    }

    public async getJobIDFromPost(postID: number) {
        const url = joinURL(MAIN_URL, `/jobapps/${postID}/edit`);
        await this.page.goto(url);
        const jobElement = await this.page.$(".job-name");
        if (!jobElement) throw new Error(`Job cannot be found in ${url}.`);
        return await getIDFromURL(jobElement, "a");
    }
}
