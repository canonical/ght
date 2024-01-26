import JobPost from "./JobPost";
import { JobBoard, JobInfo, PostInfo } from "./types";
import {
    getIDFromURL,
    getInnerText,
    joinURL,
    sendRequest,
} from "../utils/pageUtils";
import { evaluate, isDevelopment } from "../utils/processUtils";
import Config from "../config/Config";
import * as Puppeteer from "puppeteer";
import { Ora } from "ora";
// @ts-ignore 2023-11-24: https://github.com/enquirer/enquirer/issues/135 still not solved.
import { Toggle } from "enquirer";
import { runPrompt } from "../utils/commandUtils";

const RECRUITER_TAG = "RECRUITER";

export default class Job {
    private page: Puppeteer.Page;
    private jobPost: JobPost;
    private spinner: Ora;
    private config: Config;

    constructor(page: Puppeteer.Page, spinner: Ora, config: Config) {
        this.page = page;
        this.spinner = spinner;
        this.config = config;
        this.jobPost = new JobPost(page, config);
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
        sourceID: number,
        boardToPost: JobBoard,
    ) {
        this.spinner.start(`Starting to create job posts.`);
        const board = this.config.copyFromBoard;
        let protectedPosts: PostInfo[];
        // Check if a source post is provided.
        if (sourceID) {
            protectedPosts = posts.filter(
                (post) => post.id === sourceID && post.boardInfo.name === board,
            );
        } else {
            protectedPosts = posts.filter(
                (post) => post.boardInfo.name === board,
            );
        }

        if (!protectedPosts?.length) {
            const errorMessage = sourceID
                ? `Job post with ${sourceID} ID cannot be found in the ${board} Board.`
                : `No post found to clone`;
            throw new Error(errorMessage);
        }

        const cities = this.getCities(regionsToPost);
        const totalJobsToBeCloned = protectedPosts.length * cities.length;
        let count = 1;
        for (const protectedPost of protectedPosts) {
            for (const city of cities) {
                await this.jobPost.duplicate(protectedPost, city, boardToPost);
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
            postLocations.push(...this.config.regions[regionName]);
        });
        return [...new Set(postLocations)];
    }

    public async markAsLive(
        jobID: number,
        oldPosts: PostInfo[],
        boardToPost: any,
    ) {
        this.spinner.start(`Starting to set job posts as live.`);
        const jobData: JobInfo = await this.getJobData(jobID);

        // Find posts that are newly added.
        let postsToMakeLive = jobData.posts.filter(
            (post) => !oldPosts.find((oldPost) => post.id === oldPost.id),
        );

        if (postsToMakeLive.length === 0)
            postsToMakeLive = jobData.posts.filter((post) => !post.isLive);

        let count = 1;
        const totalJobsToBeUpdated = postsToMakeLive.length;
        for (const post of postsToMakeLive) {
            await this.jobPost.setStatus(post, "live", boardToPost);
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

        const jobappURL = joinURL(
            this.config.greenhouseUrl,
            `/plans/${jobID}/jobapp`,
        );
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
        enteredRegions?: string[],
    ) {
        let similarPost;
        if (similarPostID) {
            similarPost = posts.find((post) => post.id === similarPostID);
            if (!similarPost) {
                throw new Error(
                    `Post with ${similarPostID} ID cannot be found`,
                );
            }
        }
        
        const postToDelete = [];
        // Posts whose region is not part of those we define
        const postsUnknownRegion = []

        for (const post of posts) {
            const isProtected = !!this.config.protectedBoards.find(
                (protectedBoardName) =>
                    protectedBoardName.match(
                        new RegExp(post.boardInfo.name, "i"),
                    ),
            );
            const nameCheck = !similarPost || similarPost.name === post.name;

            // Job post is on the entered regions
            const locationCheck =
                !enteredRegions ||
                !!enteredRegions.find((enteredRegion) => {
                    return this.config.regions[
                        enteredRegion
                    ].includes(post.location)
                });
            // Job post region is not in our list
            const isUnknownRegion = !this.config.locations.includes(post.location);

            if (!isProtected && nameCheck) {
                if (locationCheck) {
                    postToDelete.push(post);
                } else if (isUnknownRegion) {
                    postsUnknownRegion.push(post)
                }
            }
        }

        return [postToDelete, postsUnknownRegion];
    }

    public async deletePosts(
        jobData: JobInfo,
        enteredRegions?: string[],
        similarPostID?: number,
    ) {
        this.spinner.start(`Starting to delete job posts.`);
        const posts: PostInfo[] = jobData.posts;

        const [postToDelete, postsUnknownRegion] = this.filterPostsToDelete(
            posts,
            similarPostID,
            enteredRegions,
        );

        // We need `publishStatusId` and `unpublishStatusId`
        // to be able to delete posts. They are the same for all boards.
        const boardToPost = await this.getBoardToPost();

        await this.deleteJobPosts(postToDelete, boardToPost, jobData);
        
        // Check if there are posts in unrecognised regions and prompt to delete them
        if (postsUnknownRegion.length > 0) {
            this.spinner.warn(`${postsUnknownRegion.length} job posts in unrecognised regions:`)
            for (const post of postsUnknownRegion) {
                console.log(`- ${post.location}`)
            }
            const prompt = new Toggle({
                message: "Do you want to delete them?",
                enabled: "Yes",
                disabled: "No",
                initial: false,
            });
            const confirm = await runPrompt(prompt);
            if (confirm) {
                await this.deleteJobPosts(postsUnknownRegion, boardToPost, jobData);
            }
        }
    }

    private async deleteJobPosts(postsToDelete: PostInfo[], boardToPost: JobBoard, jobData: JobInfo) {
        this.spinner.start();
        let count = 1;
        const totalJobsToDelete = postsToDelete.length;
        for (const post of postsToDelete) {
            post.isLive &&
                (await this.jobPost.setStatus(post, "offline", boardToPost));
            await this.jobPost.deletePost(post, jobData);
            await this.page.reload();

            this.spinner.text = `${count} of ${totalJobsToDelete} job posts were deleted.`;
            count++;
        }
        this.spinner.succeed(
            `${totalJobsToDelete} job posts of ${jobData.name} were deleted.`,
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
        const url = joinURL(this.config.greenhouseUrl, `/plans/${jobID}`);
        await this.page.goto(url);

        const jobTitleElement = await this.page.$(".job-name");
        const jobAnchor = await jobTitleElement?.$("a");
        if (!jobAnchor)
            throw new Error(
                `Cannot find name of the job with ${jobID} ID in the ${url} page.`,
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
        const url = joinURL(
            this.config.greenhouseUrl,
            `/alljobs/list?page=${page}`,
        );
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
                                new RegExp(recruiterTag, "i"),
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
                            throw new Error(
                                `Cannot get req ID: ${nameElement}`,
                            );
                        const matchedElement = matchedReqID[0];
                        const reqID = matchedElement.slice(
                            1,
                            matchedElement.length - 1,
                        );
                        const jobName = nameElement.split(/\([0-9]+\)/)[0];
                        jobInfo[`[${reqID}] ${jobName}`] = id;
                    }
                }
                return jobInfo;
            },
            {
                htmlAsStr: content["html"],
                recruiterTag: RECRUITER_TAG,
            },
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
        const url = joinURL(
            this.config.greenhouseUrl,
            `/jobapps/${postID}/edit`,
        );
        await this.page.goto(url);
        const jobElement = await this.page.$(".job-name");
        if (!jobElement) throw new Error(`Job cannot be found in ${url}.`);
        return await getIDFromURL(jobElement, "a");
    }

    public async getBoardToPost(): Promise<JobBoard> {
        // Find board "Canonical - Jobs" to get its id. The cloned post should be posted on that board.
        const response = await sendRequest(
            this.page,
            joinURL(this.config.greenhouseUrl, "/jobboard/get_boards"),
            {},
            {
                referrer: joinURL(this.config.greenhouseUrl, "/jobboard"),
                body: null,
                method: "GET",
            },
            "Failed to get boards",
            (queryResult: any) => !!queryResult,
        );

        const boards: JobBoard[] = response["job_boards"].map((board: any) => ({
            id: board["id"],
            name: board["company_name"],
            publishStatusId: board["publish_status_id"],
            unpublishStatusId: board["unpublish_status_id"],
        }));
        const validBoardToPost = isDevelopment()
            ? this.config.testJobBoard
            : this.config.copyToBoard;
        const boardToPost = boards.find(
            (board) => board.name === validBoardToPost,
        );
        if (!boardToPost)
            throw new Error(`Cannot found ${validBoardToPost} board`);

        return boardToPost;
    }
}
