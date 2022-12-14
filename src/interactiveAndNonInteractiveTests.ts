import { addPosts, deletePosts, provideAuthentication } from ".";
import SSO from "./automations/SSO";
import { Ora } from "ora";

let globalInteractiveStatus: boolean;
let globalSSO: SSO;
let globalSpinner: Ora;
let globalJobPostID: number;

export const interactiveAndNonInteractiveTests = async (
    interactiveStatus: boolean,
    sso: SSO,
    spinner: Ora,
    jobPostID: number
) => {
    globalInteractiveStatus = interactiveStatus;
    globalSSO = sso;
    globalSpinner = spinner;
    globalJobPostID = jobPostID;

    await failedTestReplicateJobPost();
    await misspelledTestReplicateJobPost();
    await successfulTestReplicateJobPost();
    await successfulTestDeleteJobPost();
    await multipleSuccessfulTestReplicateJobPost();
    await multipleSuccessfulTestDeleteJobPost();
    await failedTestDeleteJobPost();
};

async function failedTestReplicateJobPost() {
    console.log(
        "Testing job post replicate - this should fail as region 'test' doesn't exist..."
    );
    try {
        await provideAuthentication(globalSSO, (page) =>
            addPosts(
                globalSpinner,
                globalInteractiveStatus,
                globalJobPostID,
                ["test"],
                page
            )
        );
    } catch (e) {
        console.log(
            "Failed to add a new job post to the testing job Dev - test 1",
            e
        );
    }
}

async function misspelledTestReplicateJobPost() {
    console.log(
        "Testing job post replicate - this should fail as regions 'Americas', 'Apac' and 'EMEA' (uppercase and/or misspell) don't exist..."
    );
    try {
        await provideAuthentication(globalSSO, (page) =>
            addPosts(
                globalSpinner,
                globalInteractiveStatus,
                globalJobPostID,
                ["Americas", "Apac", "EMEA"],
                page
            )
        );
    } catch (e) {
        console.log(
            "Failed to add a new job post to the testing job Dev - test 1",
            e
        );
    }
}

async function successfulTestReplicateJobPost() {
    console.log(
        "Testing job post replicate - this should be successful as region 'apac' exists..."
    );
    try {
        await provideAuthentication(globalSSO, (page) =>
            addPosts(
                globalSpinner,
                globalInteractiveStatus,
                globalJobPostID,
                ["apac"],
                page
            )
        );
    } catch (e) {
        console.log(
            "Failed to add a new job post to the testing job Dev - test 1",
            e
        );
        process.exit(1);
    }
}

async function successfulTestDeleteJobPost() {
    console.log(
        "Testing job post delete - replicated job posts for region 'apac' should be successfully deleted..."
    );
    try {
        await provideAuthentication(globalSSO, (page) =>
            deletePosts(
                globalSpinner,
                globalInteractiveStatus,
                globalJobPostID,
                ["apac"],
                page
            )
        );
    } catch (e) {
        console.log(
            "Failed to delete the previously created job post Dev - test 1",
            e
        );
        process.exit(1);
    }
}

async function multipleSuccessfulTestReplicateJobPost() {
    console.log(
        "Testing multiple job post replicate - this should be successful as regions 'apac', 'americas' and 'emea' exist..."
    );
    try {
        await provideAuthentication(globalSSO, (page) =>
            addPosts(
                globalSpinner,
                globalInteractiveStatus,
                globalJobPostID,
                ["apac", "americas", "emea"],
                page
            )
        );
    } catch (e) {
        console.log(
            "Failed to add a new job post to the testing job Dev - test 1",
            e
        );
        process.exit(1);
    }
}

async function multipleSuccessfulTestDeleteJobPost() {
    console.log(
        "Testing multiple job post delete - replicated job posts for regions 'apac', 'americas' and 'emea' should be successfully deleted..."
    );
    try {
        await provideAuthentication(globalSSO, (page) =>
            deletePosts(
                globalSpinner,
                globalInteractiveStatus,
                globalJobPostID,
                ["apac", "americas", "emea"],
                page
            )
        );
    } catch (e) {
        console.log(
            "Failed to delete the previously created job post Dev - test 1",
            e
        );
        process.exit(1);
    }
}

async function failedTestDeleteJobPost() {
    console.log("Testing job post delete - this should fail to delete...");
    try {
        await provideAuthentication(globalSSO, (page) =>
            deletePosts(
                globalSpinner,
                globalInteractiveStatus,
                globalJobPostID,
                ["test"],
                page
            )
        );
    } catch (e) {
        console.log(
            "Failed to delete the previously created job post Dev - test 1",
            e
        );
    }
}
