import JobPost from "./automations/JobPost";
import Puppeteer from "puppeteer";
import { MAIN_URL } from "./common/constants";
import { getCSRFToken, getInnerText } from "./common/pageUtils";

(async () => {
    const exampleJobID = 2044596;
    const webDeveloperID = 1662652;
    const jobIDs = [exampleJobID, webDeveloperID];

    const browser = await Puppeteer.launch();
    const page = await browser.newPage();
    page.setCookie({
        name: "sessionid",
        value: "your-session-id",
        domain: "login.ubuntu.com",
    });

    const postJobs = new JobPost(page);
    const jobData = await postJobs.getJobData(jobIDs);
    postJobs.printJobData(jobData);

    await page.goto(MAIN_URL);
    const csrfToken = await getCSRFToken(page);
    console.log(`CSRF Token: ${csrfToken}`);

    // cleanup
    browser.close();
})();
