import { BaseController } from "./BaseController";
import Job from "../core/Job";
import { JobInfo } from "../core/types";
import { UserError } from "../utils/processUtils";
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
                this.spinner,
            );
            if (!id) throw new Error(`Job cannot be found with id ${id}.`);
            jobID = id;
            this.spinner.start(`Fetching job posts for ${name}.`);
            jobInfo = await job.getJobData(jobID);
            if (!jobInfo.posts.length)
                throw new Error(
                    `Job posts cannot be found for ${jobInfo.name}.`,
                );
            this.spinner.succeed();

            const jobPostID = await getJobPostInteractive(
                this.config,
                jobInfo.posts,
                "What job post should be copied?",
            );
            cloneFrom = jobPostID;

            regionNames = await getRegionsInteractive(
                "What region should those job posts be? Use space to make a selection.",
                this.config.regionNames,
            );

            await deletePostsInteractive(job, jobInfo, regionNames, cloneFrom);
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
                    `Job posts cannot be found for ${jobInfo.name}.`,
                );
            this.spinner.succeed();
        }

        const boardToPost = await job.getBoardToPost();
        const clonedJobPosts = await job.clonePost(
            jobInfo.posts,
            regionNames,
            cloneFrom,
            boardToPost,
        );
        // Mark all newly added job posts as live
        const processedJobCount = await job.markAsLive(
            jobID,
            jobInfo.posts,
            boardToPost,
        );

        console.log(
            green("✔"),
            `${processedJobCount} job posts for ${clonedJobPosts
                .map((post) => post.name)
                .join(", ")} of ${jobInfo.name} were created in ${regionNames}`,
        );
        console.log("Happy hiring!");

        browser.close();
    }
}
