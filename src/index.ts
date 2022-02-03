import Puppeteer from "puppeteer";
import JobPost from "./automations/JobPost";

(async () => {
    const exampleJobID = 2044596;
    const webDeveloperID = 1662652;
    const jobIDs = [exampleJobID, webDeveloperID];

    const browser = await Puppeteer.launch();
    const page = await browser.newPage();

    const postJobs = new JobPost(page);
    const jobData = await postJobs.getJobData(jobIDs);
    postJobs.printJobData(jobData);

    // cleanup
    browser.close();
})();
