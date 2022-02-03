import Puppeteer from "puppeteer";
import { Job, JobPost } from "./types";

const MAIN_URL = 'https://canonical.greenhouse.io/';

async function gotoURL(page: any, url: string) {
    await page.goto(url);
    await page.waitForNetworkIdle();
}

async function getIDFromURL(element: any, selector: string) {
    const url = await element.$eval(selector, (anchor: any) => anchor.getAttribute('href'));
    const urlParts = url.split("/");
    return urlParts[urlParts.length - 1]; 
}

function getInnerText(element: any) {
    return element.evaluate((el: any) => el.innerText);
}

async function getJobPostData(page: any) {
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

async function getJobName(page: any) {
    const jobTitleElement = await page.$(".job-name");
    const jobAnchor = await jobTitleElement.$("a");
    return await getInnerText(jobAnchor);
}

async function getJobData(page: any, jobIDs: number[]) {
    const jobData: Job[] = [];
    for (const jobID of jobIDs) {
        await gotoURL(page, `${MAIN_URL}/plans/${jobID}/jobapp`);
        
        const jobTitle = await getJobName(page); 

        const pageElements = await page.$$("*[aria-label*=Page]");
        let jobPostInfo: JobPost[] = [];
        if (pageElements) {
            // check if there is more than 1 page
            const pageCount = pageElements.length; 
            if (pageCount > 0) {
                for (let currentPage = 1; currentPage <= pageCount; currentPage++) {
                    await gotoURL(page, `https://canonical.greenhouse.io/plans/${jobID}/jobapp?page=${currentPage}`);
                    jobPostInfo.push(...await getJobPostData(page));
                }
            } else {
                jobPostInfo = await getJobPostData(page);
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

async function main() {
    const browser = await Puppeteer.launch();
	const page = await browser.newPage();
	page.setCookie(
		{
			name: "sessionid",
			value: "your-session-id",
			domain: "login.ubuntu.com"
		}
	);

    const exampleJobID = 2044596;
    const webDeveloperID = 1662652;
    const jobID = [exampleJobID, webDeveloperID];

    const jobData = await getJobData(page, jobID);
    printJobData(jobData);
    browser.close();
};

main();
