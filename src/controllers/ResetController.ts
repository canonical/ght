import { BaseController } from "./BaseController";
import Job from "../core/Job";
import { JobInfo } from "../core/types";
import JobPost from "../core/JobPost";
import {
    deleteSpecificPostInteractive,
    getAllJobPostsInteractive,
    getJobInteractive,
    getJobPostInteractive,
    getRegionsInteractive,
} from "../utils/prompts";
import { joinURL } from "../utils/pageUtils";
import { Command } from "commander";
import { green } from "colors";

export class ResetController extends BaseController {
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

            if (!this.specificJobPost) {
                const jobPostID = await getJobPostInteractive(
                    this.config,
                    jobInfo.posts,
                    "Which job posts should be deleted?"
                );
                regionNames = await getRegionsInteractive(
                    "What region should the job posts be deleted from? Use space to make a selection.",
                    this.config.regionNames
                );
                await job.deletePosts(
                    this.config,
                    jobInfo,
                    regionNames,
                    jobPostID
                );
            } else {
                const jobPostID = await getAllJobPostsInteractive(
                    this.config,
                    jobInfo.posts,
                    "Which specific job post should be deleted?"
                );
                const jobPost = new JobPost(page, this.config);
                const postInfo = jobInfo.posts.find(
                    (post) => post.id === jobPostID
                );
                const deleteSpecificPost =
                    postInfo &&
                    (await deleteSpecificPostInteractive(
                        this.config,
                        jobPost,
                        jobInfo,
                        postInfo,
                        true
                    ));
                if (deleteSpecificPost) {
                    await page.reload();
                    console.log(green("✔"), "Job post deleted.");
                }
            }
        } else if (this.specificJobPost) {
            const jobPost = new JobPost(page, this.config);
            jobID = await job.getJobIDFromPost(postID);
            jobInfo = await job.getJobData(jobID);
            const postInfo = jobInfo.posts.find((post) => post.id === postID);
            if (postInfo) {
                const referrer = joinURL(
                    this.config.greenhouseUrl,
                    `/plans/${jobInfo.id}/jobapp`
                );
                await jobPost.deletePost(postInfo, referrer);
                await page.reload();
                console.log(green("✔"), "Job post deleted.");
            } else throw new Error(`Job post cannot be found.`);
        } else {
            this.spinner.start(`Fetching the job information.`);
            jobID = await job.getJobIDFromPost(postID);
            jobInfo = await job.getJobData(jobID);
            this.spinner.succeed();
            await job.deletePosts(this.config, jobInfo, regionNames, postID);
        }

        console.log("Happy hiring!");

        await browser.close();
    }
}
