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
    // postJobs.printJobData(jobData);
    
    await page.goto(MAIN_URL);
    // const csrfToken = await getCSRFToken(page);
    // console.log(`CSRF Token: ${csrfToken}`);

    let jobData: Job;
    for (const jobID of jobIDs) {
        jobData = await postJobs.getJobData(jobID);
        await page.goto(MAIN_URL);
        const failedDelete = await postJobs.deletePosts(jobData);

        postJobs.printJobData(jobData);

        if (!failedDelete || failedDelete.length) {
            console.log(
                "Job posts that cannot be deleted: " +
                    failedDelete
                        .map((item) => "" + item)
                        .reduce((item1, item2) => `${item1}, ${item2}`)
            );
        }

        await postJobs.duplicate(jobData.posts[0], "test");
        await postJobs.setStatus(jobData.posts[2], "live");
    }

    // cleanup
    browser.close();
})();
