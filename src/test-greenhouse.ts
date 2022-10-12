import { addPosts, deletePosts, provideAuthentication } from ".";
import Job from "./automations/Job";
import SSO from "./automations/SSO";
import { Ora } from "ora";

// Dev - test 1
const JOB_ID = 2044596;
const JOB_POST_ID = 4267760;

async function successfulTestGreenhouseUISelectors(sso: SSO, spinner: Ora) {
    console.log(
        "Testing the UI selectors - this should be successful as job ID exists.."
    );
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

async function failedTestGreenhouseUISelectors(sso: SSO, spinner: Ora) {
    console.log(
        "Testing the UI selectors - this should fail as job ID doesn't exist..."
    );
    try {
        await provideAuthentication(sso, async (page) => {
            const job = new Job(page, spinner);

            // test available jobs list
            await job.getJobs();

            // test specific job details
            await job.getJobData(123456789);
        });
    } catch (e) {
        console.log("Failed to get some information from Greenhouse:", e);
    }
}

async function failedTestReplicateJobPost(sso: SSO, spinner: Ora) {
    console.log(
        "Testing job post replicate - this should fail as region 'test' doesn't exist..."
    );
    try {
        await provideAuthentication(sso, (page) =>
            addPosts(spinner, false, JOB_POST_ID, ["test"], page)
        );
    } catch (e) {
        console.log(
            "Failed to add a new job post to the testing job Scenario A:",
            e
        );
    }
}

async function successfulTestReplicateJobPost(sso: SSO, spinner: Ora) {
    console.log(
        "Testing job post replicate - this should be successful as region 'apac' exists.."
    );
    try {
        await provideAuthentication(sso, (page) =>
            addPosts(spinner, false, JOB_POST_ID, ["apac"], page)
        );
    } catch (e) {
        console.log(
            "Failed to add a new job post to the testing job Scenario A:",
            e
        );
        process.exit(1);
    }
}

async function successfulTestDeleteJobPost(sso: SSO, spinner: Ora) {
    console.log(
        "Testing job post delete - replicated job posts for region 'apac' should be successfully deleted..."
    );
    try {
        await provideAuthentication(sso, (page) =>
            deletePosts(spinner, false, JOB_POST_ID, ["apac"], page)
        );
    } catch (e) {
        console.log(
            "Failed to delete the previously created job post Scenario A:",
            e
        );
        process.exit(1);
    }
}

async function multipleSuccessfulTestReplicateJobPost(sso: SSO, spinner: Ora) {
    console.log(
        "Testing multiple job post replicate - this should be successful as regions 'apac'  and 'americas' exist.."
    );
    try {
        await provideAuthentication(sso, (page) =>
            addPosts(spinner, false, JOB_POST_ID, ["apac", "americas"], page)
        );
    } catch (e) {
        console.log(
            "Failed to add a new job post to the testing job Scenario A:",
            e
        );
        process.exit(1);
    }
}

async function multipleSuccessfulTestDeleteJobPost(sso: SSO, spinner: Ora) {
    console.log(
        "Testing multiple job post delete - replicated job posts for regions 'apac'  and 'americas' should be successfully deleted..."
    );
    try {
        await provideAuthentication(sso, (page) =>
            deletePosts(spinner, false, JOB_POST_ID, ["apac", "americas"], page)
        );
    } catch (e) {
        console.log(
            "Failed to delete the previously created job post Scenario A:",
            e
        );
        process.exit(1);
    }
}

async function failedTestDeleteJobPost(sso: SSO, spinner: Ora) {
    console.log("Testing job post delete - this should fail to delete...");
    try {
        await provideAuthentication(sso, (page) =>
            deletePosts(spinner, false, JOB_POST_ID, ["test"], page)
        );
    } catch (e) {
        console.log(
            "Failed to delete the previously created job post Scenario A:",
            e
        );
    }
}

export const tests = [
    successfulTestGreenhouseUISelectors,
    failedTestGreenhouseUISelectors,
    failedTestReplicateJobPost,
    successfulTestReplicateJobPost,
    successfulTestDeleteJobPost,
    multipleSuccessfulTestReplicateJobPost,
    multipleSuccessfulTestDeleteJobPost,
    failedTestDeleteJobPost,
];
