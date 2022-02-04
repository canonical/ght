import JobPost from "./automations/JobPost";
import SSO from "./automations/SSO";
import { MAIN_URL } from "./common/constants";
import { getCSRFToken } from "./common/pageUtils";
import Puppeteer from "puppeteer";
import { green } from "colors";

(async () => {
    const sso = new SSO();
    const loginCookies = await sso.login();
    console.log(green("✓"), "Authentications complete");

    const exampleJobID = 2044596;
    const webDeveloperID = 1662652;
    const jobIDs = [exampleJobID, webDeveloperID];

    const browser = await Puppeteer.launch();
    const page = await browser.newPage();
    await sso.setCookies(page, loginCookies);

    const postJobs = new JobPost(page);
    const jobData = await postJobs.getJobData(jobIDs);
    postJobs.printJobData(jobData);

    await page.goto(MAIN_URL);
    const csrfToken = await getCSRFToken(page);
    console.log(`CSRF Token: ${csrfToken}`);

    // cleanup
    browser.close();
})();
