import { BaseController } from "./BaseController";
import { runPrompt } from "../utils/commandUtils";
import Job from "../core/Job";
import { UserError } from "../utils/processUtils";
import config from "../config/Config";
import { loadConfigFile } from "../utils/configUtils";
import { GradersConfig, Grader, JobToAssign } from "../core/types";
import LoadBalancer from "../core/LoadBalancer";
// @ts-ignore
import { Select, MultiSelect } from "enquirer";
import { Command } from "commander";
import { homedir } from "os";
import { join } from "path";

export class AssignGradersController extends BaseController {
    private isInteractive: boolean;

    constructor(command: Command, options: any) {
        super(command);

        this.isInteractive = options.interactive;
    }

    /**
     * Return list of graders based on selected options
     */
    private createPool(
        config: GradersConfig,
        selectedJobs: JobToAssign[],
        stage: string
    ) {
        const pool: Grader[] = [];
        selectedJobs.forEach(({ jobName }) => {
            if (!config[jobName]) {
                throw new Error(`Unable to find "${jobName}" in config file`);
            }
            const activeGraders = config[jobName][stage].filter(
                (grader: any) => grader.active
            );
            activeGraders.forEach(({ name }: { name: string }) => {
                pool.push({ name, jobName });
            });
        });

        return pool;
    }

    async run() {
        const { browser, page } = await this.getPuppeteer();
        await this.auth.authenticate(page);

        // Only interactive mode for now
        if (!this.isInteractive) return;

        const job = new Job(page, this.spinner, this.config);
        const jobs = await job.getJobs();
        if (!jobs.size) throw new UserError("You don't have any job.");

        const graderCountPrompt = new Select({
            name: "Graders",
            message: "Choose the number of graders",
            choices: ["1", "2", "3", "4"],
            initial: 1,
        });
        const gradersCountResponse: string[] = await runPrompt(
            graderCountPrompt
        );
        const gradersCount: number = +gradersCountResponse;

        const stagePrompt = new Select({
            name: "Graders",
            message: "Choose the stage you would like to assign graders to",
            choices: ["Written Interview", "Hold"],
            initial: 0,
        });
        const stage: string = await runPrompt(stagePrompt);

        const prompt = new MultiSelect({
            name: "Jobs",
            message:
                "Choose the jobs you want to assign graders to. Use space to make a selection",
            choices: Array.from(jobs.keys()),
            validate: (value: string[]) => value.length > 0,
        });
        const selected: string[] = await runPrompt(prompt);

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

        const gradersConfigPath = join(
            process.env["SNAP_REAL_HOME"] || homedir(),
            "ght-graders.yml"
        );
        const gradersConfig = loadConfigFile<GradersConfig>(gradersConfigPath);
        if (!config) {
            throw new UserError("Unable to find list of graders");
        }
        const graders = this.createPool(gradersConfig, selectedJobs, stage);
        if (!graders.length) {
            throw new UserError(
                "Unable to find graders for the selected jobs. Check that the job name is matching."
            );
        }

        const loadBalancer = new LoadBalancer(
            page,
            graders,
            selectedJobs,
            this.spinner,
            gradersCount,
            this.config.greenhouseUrl,
            stage
        );
        await loadBalancer.execute();

        await browser.close();
    }
}
