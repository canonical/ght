import { FILTERED_ATTRIBUTES, MAIN_URL } from "../common/constants";
import { getCSRFToken, getInnerText, joinURL } from "../common/pageUtils";
import { Job, Post } from "../common/types";
import Puppeteer, { ElementHandle } from "puppeteer";
import { blue, green } from "colors";

export default class JobPost {
    private page: Puppeteer.Page;

    constructor(page: Puppeteer.Page) {
        this.page = page;
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

    private async getJobPostData(job: Job) {
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
                job,
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
            const job: Job = {
                name: jobTitle,
                id: jobID,
                posts: [],
            };

            const pageElements = await this.page.$$("*[aria-label*=Page]");
            if (!pageElements)
                throw new Error("Page information cannot be found");

            const pageCount = pageElements.length ? pageElements.length : 1;
            for (let currentPage = 1; currentPage <= pageCount; currentPage++) {
                await this.page.goto(`${jobappURL}?page=${currentPage}`);
                job.posts.push(...(await this.getJobPostData(job)));
            }

            jobData.push(job);
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

    /**
     * Create a copy of a given job post and move it to the given location
     * @param jobPost the original job post
     * @param location the location to duplicate to
     */
    public async duplicate(jobPost: Post, location: string): Promise<void> {
        const logName = `"${blue(jobPost.name)}" at "${blue(location)}"`;
        const url = `https://canonical.greenhouse.io/plans/${jobPost.job.id}/jobapps/new?from=duplicate&greenhouse_job_application_id=${jobPost.id}`;
        await this.page.goto(url);

        const element = await this.page.$("*[data-react-class='JobPostsForm']");
        if (!element)
            throw new Error(
                "Failed to retrieve job post form details " + logName
            );
        const jobPostFormRaw = await element.evaluate((node) =>
            node.getAttribute("data-react-props")
        );
        if (!jobPostFormRaw)
            throw new Error("Failed to retrieve job post form data " + logName);
        const jobPostForm = JSON.parse(jobPostFormRaw);
        // the pre filled job application that need modifications
        const jobApplication = jobPostForm["job_application"];
        // matching the expected payload for the POST request
        // rename attributes (old name: job_board_feed_settings)
        delete Object.assign(jobApplication, {
            job_board_feed_settings_attributes:
                jobApplication["job_board_feed_settings"],
        })["job_board_feed_settings"];
        delete Object.assign(jobApplication, {
            job_board_feed_location_attributes:
                jobApplication["job_board_feed_location"],
        })["job_board_feed_location"];
        delete Object.assign(jobApplication, {
            job_post_education_config_attributes:
                jobApplication["job_post_education_config"],
        })["job_post_education_config"];
        delete Object.assign(jobApplication, {
            questions_attributes: jobApplication["questions"],
        })["questions"];

        // the questions field needs a weird transformation
        // transform the array to object ({0: .., 1: .., ...})
        jobApplication.questions_attributes.map((question: any) => {
            question.answer_type_key = question.answer_type.key;
            delete question.answer_type;
            question.id = null;
        });
        jobApplication.questions_attributes = Object.assign(
            {},
            jobApplication.questions_attributes
        );

        // set the new location
        jobApplication.job_post_location.text_value = location;
        // set the title
        jobApplication.title = jobPost.name;

        const payload = {
            external_or_internal_greenhouse_job_board_id: jobPost.boardInfo.id,
            greenhouse_job_application: jobApplication,
            template_application_id: jobPost.id,
        };
        FILTERED_ATTRIBUTES.forEach((attr) => {
            delete payload.greenhouse_job_application[attr];
        });

        const response = await this.page.evaluate(
            async ({ referrerURL, CSRFToken, payload, url }) =>
                // create new job post
                {
                    try {
                        return await (
                            await fetch(url, {
                                headers: {
                                    accept: "application/json",
                                    "accept-language":
                                        "en-US,en;q=0.9,fr;q=0.8",
                                    "content-type":
                                        "application/json;charset=UTF-8",
                                    "x-csrf-token": CSRFToken,
                                },
                                referrer: referrerURL,
                                referrerPolicy:
                                    "strict-origin-when-cross-origin",
                                body: JSON.stringify(payload),
                                method: "POST",
                                mode: "cors",
                                credentials: "include",
                            })
                        ).json();
                    } catch {
                        return null;
                    }
                },
            {
                referrerURL: url,
                CSRFToken: await getCSRFToken(this.page),
                payload,
                url: joinURL(MAIN_URL, `/plans/${jobPost.job.id}/jobapps`),
            }
        );

        if (response?.status !== "success" || !response.goto)
            throw new Error("Failed to create a new job post " + logName);
        console.log(`${green("✓")} Created job post ${logName}`);
    }
}
