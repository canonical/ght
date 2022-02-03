import postJobs from "./automations/postJobs";

(async () => {
    const exampleJobID = 2044596;
    const webDeveloperID = 1662652;
    const jobIDs = [exampleJobID, webDeveloperID];

    await postJobs(jobIDs); 
})();