import LoadBalancer from "./LoadBalancer";
import { loadConfig, createPool } from "./utils";
import UserError from "../common/UserError";
import { runPrompt } from "../common/commandUtils";
// @ts-ignore This can be deleted after https://github.com/enquirer/enquirer/issues/135 is fixed.
import { MultiSelect } from "enquirer";
import Puppeteer from "puppeteer";
import { Ora } from "ora";
import Job from "../automations/Job";

export default async function assignGraders(
    spinner: Ora,
    page: Puppeteer.Page,
    isInteractive: boolean
) {
    // Only Written Interview for now
    const STAGE = "Written Interview";

    // Only interactive mode for now
    if (!isInteractive) return;

    console.log("Fetching your jobs");
    const job = new Job(page, spinner);
    const jobs = await job.getJobs();
    if (!jobs.size) throw new UserError("You don't have any job.");
    console.log("jobList", jobs);

    const prompt = new MultiSelect({
        name: "Jobs",
        message:
            "Choose the jobs you want to assign graders to. Use space to make a selection",
        choices: Array.from(jobs.keys()),
        validate: (value: string[]) => value.length > 0,
    });
    const selected: string[] = await runPrompt(prompt);
    console.log(`Selected jobs`, selected);

    const selectedJobs = selected.map((job) => {
        // Remove the requisition ID to match the format used in the config file
        const jobName = job.replace(/\[\d+\]/, "").trim();
        const id = jobs.get(job);
        if (!id) throw new Error(`Error assigning and id to ${jobName}`);

        return {
            id,
            jobName,
        };
    });
    console.log("selectedJobNames", selectedJobs);

    const config = await loadConfig();
    const graders = createPool(config, selectedJobs, STAGE);
    if (!graders.length) {
        throw new UserError(
            "Unable to find graders for the selected jobs. Check that the job name is matching."
        );
    }

    console.log(`Pool of graders`, graders);
    const loadBalancer = new LoadBalancer(page, graders, selectedJobs, spinner);
    await loadBalancer.execute();
}
