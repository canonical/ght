import { Application, Grader } from "./types";
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
    private jobs: string[];
    private spinner: Ora;
    private currentUser: string = "";

    constructor(
        page: Page,
        graders: Grader[],
        selectedJobs: string[],
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
        return await this.page.$$eval(".person", (people) =>
            people.map((p) => {
                const applicationID = p.getAttribute("application");
                const toggleText = p.querySelector(
                    "a.toggle-interviews"
                )?.textContent;
                const toGrade = toggleText?.includes("Scorecard due");
                const job = p
                    .querySelector(".job")
                    // Delete requisition ID next to job name
                    ?.textContent?.replace(/\(\d+\)$/, "")
                    .trim();
                const candidate = p.querySelector(".name a")?.textContent;

                if (applicationID && candidate && job && toGrade != null) {
                    return {
                        applicationID,
                        candidate,
                        job,
                        toGrade,
                    };
                }
            })
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
    private findRandomGraders(application: Application) {
        const graders = this.graders.filter(
            (grader: Grader) => grader.job == application.job
        );
        if (graders.length < 2) {
            throw new UserError("Not enough graders to pick from");
        }
        const grader1 = this.getRandom(graders);
        // Remove first grader so it doesn't get choosen twice
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
    private async assignGradersToApplication(application: Application) {
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

        // Read graders already assigned
        const gradersAssigned = await this.page.$$eval(
            "ul .search-choice span",
            (el) => el.map((grader) => grader.textContent)
        );
        console.log(`Graders already assigned`, gradersAssigned);

        // Skip if already graders assigned
        if (gradersAssigned.length >= 2) {
            console.log(`Skipping`);
            return;
        }
        // Skip if only one grader but it's not the user
        if (
            gradersAssigned.length === 1 &&
            gradersAssigned[0] !== this.currentUser
        ) {
            console.log(`Skipping`);
            return;
        }

        // Click input field
        await this.page.waitForSelector(".search-field input[type='text']");
        await this.page.click(".search-field input[type='text']");
        console.log(`Input field clicked`);

        // If there's only one grader and is the user running the command remove it
        // (hiring leads are assigned by default as graders)
        if (
            gradersAssigned.length === 1 &&
            gradersAssigned[0] === this.currentUser
        ) {
            await this.page.keyboard.press("Backspace");
            await this.page.keyboard.press("Backspace");
        }

        const [grader1, grader2] = this.findRandomGraders(application);
        console.log(`Graders picked: ${grader1.name}, ${grader2.name}`);
        await this.writeGrader(grader1);
        await this.writeGrader(grader2);
        console.log(`Graders written`);

        // Click save
        // await this.page.click("input[type='submit']");
        // Close modal
        await this.page.click("button[title='Close']");
        console.log(`Modal closed`);
        // this.spinner.stop();
        console.log(
            green("✔"),
            `Written Interview from ${application.candidate} assigned to: ${grader1.name}, ${grader2.name}`
        );
    }

    public async execute(): Promise<void> {
        await this.page.goto(
            `${MAIN_URL}people?sort_by=last_activity&sort_order=desc&stage_status_id%5B%5D=2&in_stages%5B%5D=Written+Interview`
        );
        console.log(
            `In the page ${MAIN_URL}people?sort_by=last_activity&sort_order=desc&stage_status_id%5B%5D=2&in_stages%5B%5D=Written+Interview`
        );
        await this.findUsername();
        console.log(`User is: ${this.currentUser}`);

        console.log(`Looping over the applications`);
        while (true) {
            await this.page.waitForSelector(".person");
            const applicationsPage = await this.getApplicationsPage();
            console.log(
                `Number of applications in page: ${applicationsPage.length}`
            );
            for (const application of applicationsPage) {
                if (
                    application &&
                    application?.toGrade &&
                    this.jobs.includes(application.job)
                ) {
                    console.log(
                        `Trying to assign graders for application`,
                        application
                    );
                    await this.assignGradersToApplication(application);
                }
            }

            // Keep doing this until there are no more pages
            const nextPageBtn = await this.page.$("a.next_page:not(.disabled)");
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
