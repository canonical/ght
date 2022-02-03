import { MAIN_URL } from "../common/constants";
import { getInnerText } from "../common/pageUtils";
import { Job, Post } from "../common/types";
import Puppeteer, { ElementHandle } from "puppeteer";

export default class JobPost {
    private page: Puppeteer.Page;

    constructor(page: Puppeteer.Page) {
        this.page = page;
        page.setCookie({
            name: "sessionid",
            value: "your-session-id",
            domain: "login.ubuntu.com",
        });
    }

    private async getIDFromURL(
        element: ElementHandle,
        selector: string
    ): Promise<number> {
        const url = await element.$eval(selector, (anchor: Element) =>
            anchor.getAttribute("href")
        );
        const urlParts: string[] = ("" + url).split("/");
        return +urlParts[urlParts.length - 1];
    }

    private async getJobPostData() {
        const jobPosts: Post[] = [];
        const posts = await this.page.$$(".job-application");
        if (!posts || !posts.length) throw new Error("No post found!");

        for (const post of posts) {
            const postTitle = await post.$(".job-application__name");
            if (!postTitle) throw new Error("Post title cannot be found");

            const innerText = await getInnerText(postTitle);
            const titleLocationInfo = innerText
                .split("\n")
                .map((e: string) => e.trim())
                .filter((e: string) => !!e);

            const jobPostID = await this.getIDFromURL(
                postTitle,
                "a[href*='https://boards.greenhouse.io/']"
            );

            const postBoard = await post.$(".board-column");
            if (!postBoard) throw new Error("Post board cannot be found");

            const boardName = await getInnerText(postBoard);
            const boardID = await this.getIDFromURL(postBoard, "a");

            jobPosts.push({
                id: jobPostID,
                name: titleLocationInfo[0],
                location: titleLocationInfo[1],
                boardInfo: {
                    name: boardName,
                    id: boardID,
                },
            });
        }
        return jobPosts;
    }

    private async getJobName(): Promise<string> {
        const jobTitleElement = await this.page.$(".job-name");
        const jobAnchor = await jobTitleElement?.$("a");

        if (!jobAnchor) throw new Error("job name not found");
        return await getInnerText(jobAnchor);
    }

    public async getJobData(jobIDs: number[]): Promise<Job[]> {
        const jobData: Job[] = [];
        for (const jobID of jobIDs) {
            const jobappURL = `${MAIN_URL}/plans/${jobID}/jobapp`;
            await this.page.goto(jobappURL);

            const jobTitle = await this.getJobName();

            const pageElements = await this.page.$$("*[aria-label*=Page]");
            if (!pageElements)
                throw new Error("Page information cannot be found");

            const jobPostInfo: Post[] = [];
            for (
                let currentPage = 1;
                currentPage <= pageElements.length;
                currentPage++
            ) {
                await this.page.goto(`${jobappURL}?page=${currentPage}`);
                jobPostInfo.push(...(await this.getJobPostData()));
            }

            jobData.push({
                name: jobTitle,
                id: jobID,
                posts: jobPostInfo,
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
                console.log(
                    `-- ${i + 1}) ${post.id} - ${post.name} - ${post.location}`
                );
            });
            console.log("==================");
        });
    }
}
