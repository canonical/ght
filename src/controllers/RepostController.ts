import { BaseController } from "./BaseController";
import Job from "../core/Job";
import JobPost from "../core/JobPost";
import { JobBoard, JobInfo, PostInfo } from "../core/types";
import { UserError } from "../utils/processUtils";
import {
    getJobInteractive,
    deleteSpecificPostInteractive,
    getAllJobPostsInteractive,
} from "../utils/prompts";
import { joinURL } from "../utils/pageUtils";
import { Command } from "commander";
import { green } from "colors";
import Puppeteer from "puppeteer";

export class RepostController extends BaseController {
    private isInteractive: boolean;
    private jobPostID: number;

    constructor(command: Command, jobPostId: number, options: any) {
        super(command);

        this.jobPostID = jobPostId;
        this.isInteractive = options.interactive;
    }

    async run(): Promise<void> {
        const { browser, page } = await this.getPuppeteer();
        await this.auth.authenticate(page);

        const job = new Job(page, this.spinner, this.config);
        let jobID;
        let jobInfo: JobInfo;
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
            const jobPostID = await getAllJobPostsInteractive(
                jobInfo.posts,
                "What job post should be copied?"
            );
            const boardToPost = await job.getBoardToPost();
            const jobPost = new JobPost(page, this.config);
            const postInfo = jobInfo.posts.find(
                (post) => post.id === jobPostID
            );
            if (!postInfo) throw new Error(`Job post cannot be found.`);
            await this.createSpecificJobPost(
                job,
                jobID,
                jobInfo,
                postInfo,
                boardToPost,
                page
            );
            const deleteSpecificPost = await deleteSpecificPostInteractive(
                this.config,
                jobPost,
                jobInfo,
                postInfo
            );
            if (deleteSpecificPost) {
                await page.reload();
                console.log(green("✔"), "Old job post deleted.");
            }
        } else {
            if (!postID)
                throw new UserError(`Job post ID argument is missing.`);
            this.spinner.start(`Fetching the job information.`);
            jobID = await job.getJobIDFromPost(postID);
            jobInfo = await job.getJobData(jobID);
            if (!jobInfo.posts.length)
                throw new Error(
                    `Job posts cannot be found for ${jobInfo.name}.`
                );
            this.spinner.succeed();

            const boardToPost = await job.getBoardToPost();

            const postInfo = jobInfo.posts.find((post) => post.id === postID);
            if (!postInfo) throw new Error(`Job post cannot be found.`);
            const jobPost = await this.createSpecificJobPost(
                job,
                jobID,
                jobInfo,
                postInfo,
                boardToPost,
                page
            );
            const referrer = joinURL(
                this.config.greenhouseUrl,
                `/plans/${jobInfo.id}/jobapp`
            );
            await jobPost.deletePost(postInfo, referrer);
            await page.reload();
            console.log(green("✔"), "Old job post deleted.");
        }

        console.log("Happy hiring!");

        browser.close();
    }

    private async createSpecificJobPost(
        job: Job,
        jobID: number,
        jobInfo: JobInfo,
        postInfo: PostInfo,
        boardToPost: JobBoard,
        page: Puppeteer.Page
    ): Promise<JobPost> {
        const jobPost = new JobPost(page, this.config);
        // Remove brackets from the location name
        const postLocation = postInfo.location.replace(/^\(|\)$/g, "");
        // Duplicate job post in the same location
        await jobPost.duplicate(postInfo, postLocation, boardToPost);
        // Mark all newly added job posts as live
        await job.markAsLive(jobID, jobInfo.posts, boardToPost);
        console.log(
            green("✔"),
            `New job post for ${postInfo.name} of ${jobInfo.name} is created in ${postLocation}`
        );
        // Mark old job post as offline
        await jobPost.setStatus(postInfo, "offline", boardToPost);
        console.log(green("✔"), "Old job post marked as offline.");

        return jobPost;
    }
}
