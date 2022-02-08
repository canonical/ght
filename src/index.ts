import JobPost from "./automations/JobPost";
import SSO from "./automations/SSO";
import { MAIN_URL } from "./common/constants";
import { Job } from "./common/types";
import Puppeteer from "puppeteer";
import { green } from "colors";

(async () => {
    const sso = new SSO();
    const loginCookies = await sso.login();
    console.log(green("✓"), "Authentication complete");

    const exampleJobID = 2044596;
    const jobIDs = [exampleJobID];

    const browser = await Puppeteer.launch();
    const page = await browser.newPage();
    await sso.setCookies(page, loginCookies);

    const postJobs = new JobPost(page);
    await page.goto(MAIN_URL);

    let jobData: Job;
    for (const jobID of jobIDs) {
        jobData = await postJobs.getJobData(jobID);
        await page.goto(MAIN_URL);
        postJobs.printJobData(jobData);

        await postJobs.deletePosts(jobData);

        await postJobs.duplicate(jobData.posts[0], "test");
        await postJobs.setStatus(jobData.posts[2], "live");
    }

    // cleanup
    browser.close();
})();
