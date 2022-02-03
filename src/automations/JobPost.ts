import { rejects } from "assert";
import { resolve } from "path";
import Puppeteer from "puppeteer";
import { MAIN_URL } from "../common/constants";
import { getIDFromURL, getInnerText } from "../common/pageUtils";
import { Job, Post } from "../common/types";

export default class JobPost {
    private page: Puppeteer.Page;

    constructor(page: Puppeteer.Page) {
        this.page = page;
        page.setCookie(
            {
                name: "sessionid",
                value: "your-session-id",
                domain: "login.ubuntu.com"
            }
        );
    }

    private async getJobPostData() {
        const jobPosts: Post[] = [];
        const posts = await this.page.$$(".job-application");
        if (!posts || posts.length === 0) {
            console.error("No post found!");
            return jobPosts;
        }
    
        for (let post of posts) {
            const postTitle = await post.$(".job-application__name"); 
            if (!postTitle) {
                console.error("Post title cannot be found");
                continue;
            }
            const innerText = await getInnerText(postTitle);
            const titleLocationInfo = innerText.split("\n").map((e: string) => e.trim()).filter((e: string) => !!e);
    
            const jobPostID = await getIDFromURL(postTitle, "a[href*='https://boards.greenhouse.io/']");
            
            const postBoard = await post.$(".board-column"); 
            if (!postBoard) {
                console.error("Post board cannot be found");
                continue;
            }
            const boardName = await getInnerText(postBoard);
            const boardID = await getIDFromURL(postBoard, "a");
    
            jobPosts.push({
                id: jobPostID,
                name: titleLocationInfo[0],
                location: titleLocationInfo[1],
                boardInfo: {
                    name: boardName,
                    id: boardID
                }
            });
        }
        return jobPosts;
    }
    
    private async getJobName(): Promise<string | null> {
        const jobTitleElement = await this.page.$(".job-name");
        const jobAnchor = await jobTitleElement?.$("a");

        return jobAnchor ? await getInnerText(jobAnchor) : 
            new Promise(reject => reject(null));
    }
    
    public async getJobData(jobIDs: number[]): Promise<Job[]> {
        const jobData: Job[] = [];
        for (const jobID of jobIDs) {
            const jobappURL = `${MAIN_URL}/plans/${jobID}/jobapp`;
            await this.page.goto(jobappURL);
            
            const jobTitle = await this.getJobName(); 
            if (!jobTitle) {
                console.error("Job title cannot be found.");
                continue;
            }
    
            const pageElements = await this.page.$$("*[aria-label*=Page]");
            let jobPostInfo: Post[] = [];
            if (pageElements) {
                // check if there is more than 1 page
                const pageCount = pageElements.length; 
                if (pageCount > 0) {
                    for (let currentPage = 1; currentPage <= pageCount; currentPage++) {
                        await this.page.goto(`${jobappURL}?page=${currentPage}`);
                        jobPostInfo.push(...await this.getJobPostData());
                    }
                } else {
                    jobPostInfo = await this.getJobPostData();
                }
            } else {
                console.error("Page information cannot be found!");
            }
            jobData.push({
                name: jobTitle,
                id: jobID,
                posts: jobPostInfo
            });
        }
        return jobData;
    }
    
    // TODO delete this function
    public printJobData(jobData: Job[]): void {
        jobData.forEach((job: Job) => {
            console.log(`Job: ${job.id} - ${job.name}`);
            console.log("Posts: ");
            job.posts.forEach((post: Post, i: number) => {
                console.log(`-- ${i + 1}) ${post.id} - ${post.name} - ${post.location}`)
            });
            console.log("==================")
        });
    }
}