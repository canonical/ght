import { provideAuthentication } from ".";
import { interactiveAndNonInteractiveTests } from "./interactiveAndNonInteractiveTests";
import assignGraders from "./assign-graders";
import Job from "./automations/Job";
import SSO from "./automations/SSO";
import { Ora } from "ora";

// Dev - test 1
const JOB_ID = 2044596;
const JOB_POST_ID = 4267760;

// Check for env variable - this variable will be set in the Github actions yaml
const githubActions = process.env.GITHUB_ACTIONS;

async function successfulTestGreenhouseUISelectors(sso: SSO, spinner: Ora) {
    console.log(
        "Testing the UI selectors - this should be successful as job ID exists..."
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

async function runInteractiveAndNonInteractiveTests(sso: SSO, spinner: Ora) {
    // Run non-interactive tests
    await interactiveAndNonInteractiveTests(false, sso, spinner, JOB_POST_ID);
    // Won't run interactive tests in Github actions
    if (!githubActions)
        await interactiveAndNonInteractiveTests(
            true,
            sso,
            spinner,
            JOB_POST_ID
        );
}

// Won't run this interactive test in Github actions
async function successfulTestAssignGraders(sso: SSO, spinner: Ora) {
    if (!githubActions) {
        console.log(
            "Testing assign graders - this should be successful as graders' names exist in config file..."
        );
        try {
            await provideAuthentication(sso, (page) =>
                assignGraders(spinner, page, true)
            );
        } catch (e) {
            console.log("Failed to assign graders", e);
            process.exit(1);
        }
    }
}

// Won't run this interactive test in Github actions
async function firstFailedTestAssignGraders(sso: SSO, spinner: Ora) {
    if (!githubActions) {
        // Delete job from the 'ght-graders.yml' file
        console.log(
            "Testing assign graders - this should fail as job doesn't exist in the config file..."
        );
        try {
            await provideAuthentication(sso, (page) =>
                assignGraders(spinner, page, true)
            );
        } catch (e) {
            console.log("Failed to assign graders", e);
        }
    }
}

// Won't run this interactive test in Github actions
async function secondFailedTestAssignGraders(sso: SSO, spinner: Ora) {
    if (!githubActions) {
        // Delete the 'ght-graders.yml' file
        console.log(
            "Testing assign graders - this should fail as config file doesn't exist..."
        );
        try {
            await provideAuthentication(sso, (page) =>
                assignGraders(spinner, page, true)
            );
        } catch (e) {
            console.log("Failed to assign graders", e);
        }
    }
}

export const tests = [
    successfulTestGreenhouseUISelectors,
    failedTestGreenhouseUISelectors,
    runInteractiveAndNonInteractiveTests,
    successfulTestAssignGraders,
    firstFailedTestAssignGraders,
    secondFailedTestAssignGraders,
];
