import Puppeteer from "puppeteer";
import { MAIN_URL } from "../common/constants";
import { getIDFromURL, getInnerText, gotoURL } from "../common/pageUtils";
import { Job, JobPost } from "../types";

async function postJobs(jobIDs: number[]) {
    const browser = await Puppeteer.launch();
    const page = await browser.newPage();

    async function getJobPostData() {
        const jobPosts: JobPost[] = [];
        const posts = await page.$$(".job-application");
        if (!posts || posts.length === 0) {
            console.error("No post found!");
            return jobPosts;
        }
    
        for (let post of posts) {
            const postTitle = await post.$(".job-application__name"); 
            const innerText = await getInnerText(postTitle);
            const titleLocationInfo = innerText.split("\n").map((e: string) => e.trim()).filter((e: string) => !!e);
    
            const jobPostID = await getIDFromURL(postTitle, "a[href*='https://boards.greenhouse.io/']");
            
            const postBoard = await post.$(".board-column"); 
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
    
    async function getJobName() {
        const jobTitleElement = await page.$(".job-name");
        const jobAnchor = await jobTitleElement?.$("a");
        return await getInnerText(jobAnchor);
    }
    
    async function getJobData() {
        const jobData: Job[] = [];
        for (const jobID of jobIDs) {
            const jobappURL = `${MAIN_URL}/plans/${jobID}/jobapp`;
            await gotoURL(page, jobappURL);
            
            const jobTitle = await getJobName(); 
    
            const pageElements = await page.$$("*[aria-label*=Page]");
            let jobPostInfo: JobPost[] = [];
            if (pageElements) {
                // check if there is more than 1 page
                const pageCount = pageElements.length; 
                if (pageCount > 0) {
                    for (let currentPage = 1; currentPage <= pageCount; currentPage++) {
                        await gotoURL(page, `${jobappURL}?page=${currentPage}`);
                        jobPostInfo.push(...await getJobPostData());
                    }
                } else {
                    jobPostInfo = await getJobPostData();
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
    function printJobData(jobData: Job[]) {
        jobData.forEach((job: Job) => {
            console.log(`Job: ${job.id} - ${job.name}`);
            console.log("Posts: ");
            job.posts.forEach((post: JobPost, i: number) => {
                console.log(`-- ${i + 1}) ${post.id} - ${post.name} - ${post.location}`)
            });
            console.log("==================")
        });
    }

    page.setCookie(
        {
            name: "sessionid",
            value: "your-session-id",
            domain: "login.ubuntu.com"
        }
    );

    const jobData = await getJobData();
    printJobData(jobData);
    browser.close();
}

export default postJobs;