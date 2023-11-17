import { BaseController } from "./BaseController";
import Job from "../core/Job";
import JobPost from "../core/JobPost";
import { JobBoard, JobInfo, PostInfo } from "../core/types";
import { UserError } from "../utils/processUtils";
import {
    getJobInteractive,
    getJobPostInteractive,
    getRegionsInteractive,
    deletePostsInteractive,
    deleteSpecificPostInteractive,
    getAllJobPostsInteractive,
} from "../utils/prompts";
import { Command } from "commander";
import { green } from "colors";
import Puppeteer from "puppeteer";

export class ReplicateController extends BaseController {
    private isInteractive: boolean;
    private regions: string[];
    private jobPostID: number;
    private specificJobPost: boolean;

    constructor(command: Command, jobPostId: number, options: any) {
        super(command);

        this.jobPostID = jobPostId;
        this.isInteractive = options.interactive;
        this.regions = options.regions
            ? this.validateRegionParam(options.regions)
            : this.config.regionNames;
        this.specificJobPost = options.specific;
    }

    async run(): Promise<void> {
        const { browser, page } = await this.getPuppeteer();
        await this.auth.authenticate(page);

        const job = new Job(page, this.spinner, this.config);
        let jobID;
        let jobInfo: JobInfo;
        let regionNames = this.regions;
        const postID = this.jobPostID;

        if (this.isInteractive) {
            const { name, id } = await getJobInteractive(
                job,
                "What job would you like to create job posts for?",
                this.spinner
            );
            if (!id) throw new Error(`Job cannot be found with id ${id}.`);
            jobID = id;
            this.spinner.start(`Fetching job posts for ${name}.`);
            jobInfo = await job.getJobData(jobID);
            if (!jobInfo.posts.length)
                throw new Error(
                    `Job posts cannot be found for ${jobInfo.name}.`
                );
            this.spinner.succeed();

            if (!this.specificJobPost) {
                const jobPostID = await getJobPostInteractive(
                    this.config,
                    jobInfo.posts,
                    "What job post should be copied?"
                );
                regionNames = await getRegionsInteractive(
                    "What region should those job posts be? Use space to make a selection.",
                    this.config.regionNames
                );

                await deletePostsInteractive(
                    this.config,
                    job,
                    jobInfo,
                    regionNames,
                    jobPostID
                );
            } else {
                const jobPostID = await getAllJobPostsInteractive(
                    this.config,
                    jobInfo.posts,
                    "What job post should be copied?"
                );
                const boardToPost = await job.getBoardToPost();
                const jobPost = new JobPost(page, this.config);
                const postInfo = jobInfo.posts.find(
                    (post) => post.id === jobPostID
                );
                await this.createSpecificJobPost(
                    job,
                    jobID,
                    jobInfo,
                    postInfo,
                    boardToPost,
                    page
                );
                const deleteSpecificPost =
                    postInfo &&
                    (await deleteSpecificPostInteractive(
                        this.config,
                        jobPost,
                        jobInfo,
                        postInfo
                    ));
                if (deleteSpecificPost) {
                    await page.reload();
                    console.log(green("✔"), "Old job post deleted.");
                }
            }
        } else {
            if (!postID)
                throw new UserError(`Job post ID argument is missing.`);
            if (!regionNames)
                throw new UserError(`Region parameter is missing.`);

            this.spinner.start(`Fetching the job information.`);
            jobID = await job.getJobIDFromPost(postID);
            jobInfo = await job.getJobData(jobID);
            if (!jobInfo.posts.length)
                throw new Error(
                    `Job posts cannot be found for ${jobInfo.name}.`
                );
            this.spinner.succeed();

            const boardToPost = await job.getBoardToPost();

            if (this.specificJobPost) {
                const postInfo = jobInfo.posts.find(
                    (post) => post.id === postID
                );
                await this.createSpecificJobPost(
                    job,
                    jobID,
                    jobInfo,
                    postInfo,
                    boardToPost,
                    page
                );
                const jobPost = new JobPost(page, this.config);
                postInfo &&
                    (await jobPost.setStatus(postInfo, "offline", boardToPost));
                console.log(green("✔"), "Old job post marked as offline.");
            } else {
                const clonedJobPosts = await job.clonePost(
                    jobInfo.posts,
                    regionNames,
                    postID,
                    boardToPost
                );
                // Mark all newly added job posts as live
                const processedJobCount = await job.markAsLive(
                    jobID,
                    jobInfo.posts,
                    boardToPost
                );

                console.log(
                    green("✔"),
                    `${processedJobCount} job posts for ${clonedJobPosts
                        .map((post) => post.name)
                        .join(", ")} of ${
                        jobInfo.name
                    } were created in ${regionNames}`
                );
            }
        }

        console.log("Happy hiring!");

        browser.close();
    }

    private async createSpecificJobPost(
        job: Job,
        jobID: number,
        jobInfo: JobInfo,
        postInfo: PostInfo | undefined,
        boardToPost: JobBoard,
        page: Puppeteer.Page
    ): Promise<void> {
        let postLocation: string;
        if (postInfo) {
            const jobPost = new JobPost(page, this.config);
            // Remove brackets from the location name
            postLocation = postInfo.location.replace(/^\(|\)$/g, "");
            // Duplicate job post in the same location
            await jobPost.duplicate(postInfo, postLocation, boardToPost);
        } else throw new Error(`Job post cannot be found.`);
        // Mark all newly added job posts as live
        await job.markAsLive(jobID, jobInfo.posts, boardToPost);

        console.log(
            green("✔"),
            `New job post for ${postInfo.name} of ${jobInfo.name} is created in ${postLocation}`
        );
    }
}
