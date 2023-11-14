import { BaseController } from "./BaseController";
import Job from "../core/Job";
import JobPost from "../core/JobPost";
import { JobInfo } from "../core/types";
import { UserError } from "../utils/processUtils";
import { joinURL } from "../utils/pageUtils";
import {
    getJobInteractive,
    getJobPostInteractive,
    getRegionsInteractive,
    deletePostsInteractive,
} from "../utils/prompts";
import { Command } from "commander";
import { green } from "colors";

export class ReplicateController extends BaseController {
    private isInteractive: boolean;
    private regions: string[];
    private jobPostID: number;

    constructor(command: Command, jobPostId: number, options: any) {
        super(command);

        this.jobPostID = jobPostId;
        this.isInteractive = options.interactive;
        this.regions = options.regions
            ? this.validateRegionParam(options.regions)
            : this.config.regionNames;
    }

    async run(): Promise<void> {
        const { browser, page } = await this.getPuppeteer();
        await this.auth.authenticate(page);

        const job = new Job(page, this.spinner, this.config);
        let jobID;
        let jobInfo: JobInfo;
        let regionNames = this.regions;
        let cloneFrom;

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

            const jobPostID = await getJobPostInteractive(
                this.config,
                jobInfo.posts,
                "What job post should be copied?"
            );
            cloneFrom = jobPostID;

            regionNames = await getRegionsInteractive(
                "What region should those job posts be? Use space to make a selection.",
                this.config.regionNames
            );

            await deletePostsInteractive(
                this.config,
                job,
                jobInfo,
                regionNames,
                cloneFrom
            );
        } else {
            if (!this.jobPostID)
                throw new UserError(`Job post ID argument is missing.`);
            if (!regionNames)
                throw new UserError(`Region parameter is missing.`);
            cloneFrom = this.jobPostID;

            this.spinner.start(`Fetching the job information.`);
            jobID = await job.getJobIDFromPost(this.jobPostID);
            jobInfo = await job.getJobData(jobID);
            if (!jobInfo.posts.length)
                throw new Error(
                    `Job posts cannot be found for ${jobInfo.name}.`
                );
            this.spinner.succeed();
        }

        const boardToPost = await job.getBoardToPost();
        const clonedJobPosts = await job.clonePost(
            jobInfo.posts,
            regionNames,
            cloneFrom,
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
                .join(", ")} of ${jobInfo.name} were created in ${regionNames}`
        );
        console.log("Happy hiring!");

        browser.close();
    }

    public async replicateAndDelete(): Promise<void> {
        const { browser, page } = await this.getPuppeteer();
        await this.auth.authenticate(page);
        const job = new Job(page, this.spinner, this.config);
        let jobID;
        let jobInfo: JobInfo;

        if (this.isInteractive) {
            const { name, id } = await getJobInteractive(
                job,
                "What job would you like this action for?",
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

            this.jobPostID = await getJobPostInteractive(
                this.config,
                jobInfo.posts,
                "What job post should this action be for?"
            );
        } else {
            jobID = await job.getJobIDFromPost(this.jobPostID);
            jobInfo = await job.getJobData(jobID);
            if (!jobInfo.posts.length)
                throw new Error(
                    `Job posts cannot be found for ${jobInfo.name}.`
                );
        }

        const postInfo = jobInfo.posts.find(
            (post) => post.id === this.jobPostID
        );

        if (postInfo) {
            const jobPost = new JobPost(page, this.config);
            const boardToPost = await job.getBoardToPost();
            // Duplicate job post in the same location
            // Remove brackets from the location name
            const postLocation = postInfo.location.replace(/^\(|\)$/g, "");
            await jobPost.duplicate(postInfo, postLocation, boardToPost);
            console.log(green("✔"), "Job post duplicated.");
            if (postInfo.isLive) {
                // TODO: Set new job post as live
                // await jobPost.setStatus(postInfo, "live", boardToPost);
                // console.log(green("✔"), "New job post marked as live.");
                await jobPost.setStatus(postInfo, "offline", boardToPost);
                console.log(green("✔"), "old job post marked as offline.");
            }
            // Delete old job post
            const referrer = joinURL(
                this.config.greenhouseUrl,
                `/plans/${jobInfo.id}/jobapp`
            );
            await jobPost.deletePost(postInfo, referrer);
            await page.reload();
            console.log(green("✔"), "Job post deleted.");
        } else throw new Error(`Job post cannot be found.`);

        console.log("Happy hiring!");
        browser.close();
    }
}
