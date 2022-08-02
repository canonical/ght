import UserError from "../common/UserError";
import { runPrompt } from "../common/commandUtils";
// @ts-ignore This can be deleted after https://github.com/enquirer/enquirer/issues/135 is fixed.
import { MultiSelect } from "enquirer";
import LoadBalancer from "./LoadBalancer";
import Puppeteer from "puppeteer";
import { loadConfig, createPool } from "./utils";

export default async function assignGraders(
    page: Puppeteer.Page,
    isInteractive: boolean
) {
    // Only Written Interview for now
    const STAGE = "Written Interview";

    // Only interactive mode for now
    if (isInteractive) {
        const config = await loadConfig();
        const jobs = Object.keys(config);
        if (!jobs.length) throw new UserError("You don't have any job.");

        const prompt = new MultiSelect({
            name: "Jobs",
            message:
                "Choose the jobs you want to assign graders to. Use space to make a selection",
            choices: jobs,
            validate: (value: string[]) => value.length > 0,
        });
        const selectedJobs: string[] = await runPrompt(prompt);
        const graders = createPool(config, selectedJobs, STAGE);

        const loadBalancer = new LoadBalancer(page, graders, selectedJobs);
        await loadBalancer.execute();
    }
}
