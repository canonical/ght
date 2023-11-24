import { BaseController } from "./BaseController";
import Job from "../core/Job";
import { JobInfo } from "../core/types";
import {
    getJobInteractive,
    getJobPostInteractive,
    getRegionsInteractive,
} from "../utils/prompts";
import { Command } from "commander";

export class ResetController extends BaseController {
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
        let postID = this.jobPostID;

        if (this.isInteractive) {
            const { name, id } = await getJobInteractive(
                job,
                "What job would you like to delete job posts from?",
                this.spinner
            );

            if (!id) throw new Error(`Job with ${id} cannot be found.`);
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
                "Which job posts should be deleted?"
            );
            postID = jobPostID;

            regionNames = await getRegionsInteractive(
                "What region should the job posts be deleted from? Use space to make a selection.",
                this.config.regionNames
            );
        } else {
            this.spinner.start(`Fetching the job information.`);
            jobID = await job.getJobIDFromPost(postID);
            jobInfo = await job.getJobData(jobID);
            this.spinner.succeed();
        }
        await job.deletePosts(jobInfo, regionNames, postID);

        console.log("Happy hiring!");

        await browser.close();
    }
}
