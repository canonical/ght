import { Application, Grader, Job } from "./types";
import { MAIN_URL } from "../common/constants";
import UserError from "../common/UserError";
import { green } from "colors";
import { Ora } from "ora";
import { Page } from "puppeteer";

/**
 * Interact with Greenhouse UI and assign
 * graders to written inteviews
 */
export default class LoadBalancer {
    private page: Page;
    private graders: Grader[];
    private jobs: Job[];
    private spinner: Ora;
    private currentUser: string = "";

    constructor(
        page: Page,
        graders: Grader[],
        selectedJobs: Job[],
        spinner: Ora
    ) {
        this.page = page;
        this.graders = graders;
        this.jobs = selectedJobs;
        this.spinner = spinner;
    }

    /**
     * Return applications in current page
     */
    private async getApplicationsPage() {
        console.log("Getting applications in page");
        return await this.page.$$eval(
            ".person",
            (people, user) => {
                return people.map((p) => {
                    const applicationID = p.getAttribute("application");
                    const toggleText = p.querySelector(
                        "a.toggle-interviews"
                    )?.textContent;
                    const toGrade = toggleText === `Scorecard due from ${user}`;
                    const candidate = p.querySelector(".name a")?.textContent;

                    if (applicationID && candidate && toGrade != null) {
                        return {
                            applicationID,
                            candidate,
                            toGrade,
                        };
                    }
                });
            },
            this.currentUser
        );
    }

    /**
     * Get random grader from array
     */
    private getRandom(graders: Grader[]) {
        return graders[Math.floor(Math.random() * graders.length)];
    }

    /**
     * Type grader's name
     */
    private async writeGrader(grader: Grader) {
        await this.page.type(".search-field input[type='text']", grader.name);
        await this.page.keyboard.press("Enter");
    }

    /**
     * Find two random graders for an application
     */
    private findRandomGraders(job: Job, application: Application) {
        const graders = this.graders.filter(
            (grader: Grader) => grader.jobName == job.jobName
        );
        if (graders.length < 2) {
            throw new UserError("Not enough graders to pick from");
        }
        const grader1 = this.getRandom(graders);
        // Remove first grader so it doesn't get chosen twice
        const grader2 = this.getRandom(
            graders.filter((name) => name !== grader1)
        );

        return [grader1, grader2];
    }

    /**
     * Find current user name in UI
     */
    private async findUsername() {
        const currentUser = await this.page.$eval(
            "script[data-user-name]",
            (el) => (el as HTMLElement).dataset.userName
        );
        if (!currentUser) {
            throw new Error("Unable to find user's name in Greenhouse");
        }
        this.currentUser = currentUser;
    }

    /**
     * Assign graders to one application
     */
    private async assignGradersToApplication(
        job: Job,
        application: Application,
        graders: Grader[]
    ) {
        // this.spinner.start("Processing applications");

        const selector = `.person[application="${application?.applicationID}"]`;

        // Click toggle button
        await this.page.waitForSelector(`${selector} .toggle-interviews`);
        await this.page.$eval(`${selector} .toggle-interviews`, (toggle) =>
            (toggle as HTMLAnchorElement).click()
        );
        console.log(`Toggle interviews button clicked`);

        // Click edit
        await this.page.waitForSelector(
            `${selector} .edit-take-home-test-graders-link`
        );
        console.log(`Edit button clicked`);

        await this.page.$eval(
            `${selector} .edit-take-home-test-graders-link`,
            (btn) => (btn as HTMLAnchorElement).click()
        );

        console.log(`Waiting for modal to open`);
        // Wait for modal to open
        await this.page.waitForSelector("ul.chzn-choices", {
            visible: true,
        });

        // Click input field
        await this.page.waitForSelector(".search-field input[type='text']");
        await this.page.click(".search-field input[type='text']");
        console.log(`Input field clicked`);

        // Delete current use assigned
        await this.page.keyboard.press("Backspace");
        await this.page.keyboard.press("Backspace");

        console.log(`Graders picked: ${graders[0].name}, ${graders[1].name}`);
        await this.writeGrader(graders[0]);
        await this.writeGrader(graders[1]);
        console.log(`Graders written`);

        // Click save
        // await this.page.click("input[type='submit']");
        // Close modal
        await this.page.click("button[title='Close']");
        console.log(`Modal closed`);
        // this.spinner.stop();
        console.log(
            green("✔"),
            `Written Interview from ${application.candidate} assigned to: ${graders[0].name}, ${graders[1].name}`
        );
    }

    /**
     * Return url for the page that shows written interviews for a given job
     */
    private buildUrl(job: Job) {
        const url = new URL(`${MAIN_URL}people`);
        url.searchParams.append("stage_status_id", "2");
        url.searchParams.append("in_stages", "Written Interview");
        url.searchParams.append("hiring_plan_id", job.id.toString());

        return url.href;
    }

    public async execute(): Promise<void> {
        for (const job of this.jobs) {
            const url = this.buildUrl(job);
            console.log(`Url: ${url}`);
            await this.page.goto(url);
            await this.page.waitForSelector(".person");

            await this.findUsername();
            console.log(`User is: ${this.currentUser}`);

            console.log(`Looping over the applications`);
            while (true) {
                const applicationsPage = await this.getApplicationsPage();
                console.log(
                    `Number of applications in page: ${applicationsPage.length}`
                );
                console.log("applicationsPage", applicationsPage);
                for (const application of applicationsPage) {
                    if (application && application.toGrade) {
                        const graders = this.findRandomGraders(
                            job,
                            application
                        );
                        await this.assignGradersToApplication(
                            job,
                            application,
                            graders
                        );
                    }
                }

                // Keep doing this until there are no more pages
                const nextPageBtn = await this.page.$(
                    "a.next_page:not(.disabled)"
                );
                console.log(`Next page exists? ${nextPageBtn ? "Yes" : "No"}`);
                if (!nextPageBtn) break;

                console.log(`Going to the next page`);
                await Promise.all([
                    this.page.waitForNavigation(),
                    nextPageBtn.click(),
                ]);
            }
        }
    }
}
