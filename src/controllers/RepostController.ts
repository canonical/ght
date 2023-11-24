import { BaseController } from "./BaseController";
import Job from "../core/Job";
import JobPost from "../core/JobPost";
import { JobBoard, JobInfo, PostInfo } from "../core/types";
import { UserError } from "../utils/processUtils";
import { getJobInteractive } from "../utils/prompts";
import { runPrompt } from "../utils/commandUtils";
import { Command } from "commander";
import { green } from "colors";
import Puppeteer from "puppeteer";
// @ts-ignore This can be deleted after https://github.com/enquirer/enquirer/issues/135 is fixed.
import { Select, Toggle } from "enquirer";

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
                "What job's job post would you like to repost?",
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
            const jobPostID = await this.getPostInteractive(
                jobInfo.posts,
                "What job post should be copied?"
            );
            const boardToPost = await job.getBoardToPost();
            const jobPost = new JobPost(page, this.config);
            const postInfo = jobInfo.posts.find(
                (post) => post.id === jobPostID
            );
            if (!postInfo) throw new Error(`Job post cannot be found.`);
            await this.createJobPost(
                job,
                jobID,
                jobInfo,
                postInfo,
                boardToPost,
                page
            );
            const deletePost = await this.deletePostInteractive(
                jobPost,
                jobInfo,
                postInfo
            );
            if (deletePost) {
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
            const jobPost = await this.createJobPost(
                job,
                jobID,
                jobInfo,
                postInfo,
                boardToPost,
                page
            );
            await jobPost.deletePost(postInfo, jobInfo);
            await page.reload();
            console.log(green("✔"), "Old job post deleted.");
        }

        console.log("Happy hiring!");

        browser.close();
    }

    private async createJobPost(
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

        return jobPost;
    }

    private async getPostInteractive(
        posts: PostInfo[],
        message: string
    ): Promise<number> {
        if (!posts || !posts.length) throw new Error(`No job post found.`);

        const prompt = new Select({
            name: "Job Post",
            message,
            choices: [
                ...posts.map((post) => {
                    return `${post.name} - ${post.location} - ${post.id}`;
                }),
            ],
        });
        const jobPostName = await runPrompt(prompt);
        const matchedJobPost = posts.find(
            (post) =>
                `${post.name} - ${post.location} - ${post.id}` === jobPostName
        );
        if (!matchedJobPost)
            throw new Error(`No job post found with name ${jobPostName}.`);

        return matchedJobPost.id;
    }

    private async deletePostInteractive(
        jobPost: JobPost,
        jobInfo: JobInfo,
        postInfo: PostInfo
    ): Promise<boolean> {
        const prompt = new Toggle({
            message: "Do you want to delete the old job post?",
            enabled: "Yes",
            disabled: "No",
            initial: true,
        });

        const shouldDelete = await runPrompt(prompt);
        if (!shouldDelete) return false;
        await jobPost.deletePost(postInfo, jobInfo);
        return true;
    }
}
