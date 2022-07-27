import { addPosts, deletePosts, provideAuthentication } from ".";
import Job from "./automations/Job";
import SSO from "./automations/SSO";
import { Ora } from "ora";

// Demo Job - Scenario A
const JOB_ID = 1753300;
const JOB_POST_ID = 3958987;

async function testGreenhouseUISelectors(sso: SSO, spinner: Ora) {
    console.log("Testing the UI selectors..");
    try {
        await provideAuthentication(sso, async (page) => {
            const job = new Job(page, spinner);

            // test available jobs list
            await job.getJobs();

            // test specific job details
            await job.getJobData(JOB_ID);
        });
    } catch (e) {
        console.log("Failed to get some information from Greenhouse:", e);
        process.exit(1);
    }
}

async function testReplicateJobPost(sso: SSO, spinner: Ora) {
    console.log("Testing job post replicate..");
    try {
        await provideAuthentication(sso, (page) =>
            addPosts(spinner, false, JOB_POST_ID, ["test"], page)
        );
    } catch (e) {
        console.log(
            "Failed to add a new job post to the testing job Scenario A:",
            e
        );
        process.exit(1);
    }
}
async function testDeleteJobPost(sso: SSO, spinner: Ora) {
    console.log("Testing job post delete..");
    try {
        await provideAuthentication(sso, (page) =>
            deletePosts(spinner, false, JOB_POST_ID, ["test"], page)
        );
    } catch (e) {
        console.log(
            "Failed to delete the previously created job post Scenario A:",
            e
        );
        process.exit(1);
    }
}

export const tests = [
    testGreenhouseUISelectors,
    testReplicateJobPost,
    testDeleteJobPost,
];
