import { Application, Grader, Job, GraderRecord } from "./types";
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
    private currentUser = "";
    private gradersCount = 2;
    private graderStore: GraderRecord[] = [];

    constructor(
        page: Page,
        graders: Grader[],
        selectedJobs: Job[],
        spinner: Ora,
        gradersCount: number
    ) {
        this.page = page;
        this.graders = graders;
        this.jobs = selectedJobs;
        this.spinner = spinner;
        this.gradersCount = gradersCount;
    }

    /**
     * Return applications in current page
     */
    private async getApplicationsPage() {
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
     * Type grader's name
     */
    private async writeGrader(grader: Grader) {
        await this.page.type(".search-field input[type='text']", grader.name);
        await this.page.keyboard.press("Enter");

        // Make sure that the user was correctly assigned
        const gradersAssigned = await this.page.$$eval(
            "ul .search-choice span",
            (el) => el.map((grader) => grader.textContent)
        );
        if (!gradersAssigned.includes(grader.name)) {
            throw new UserError(
                `Couldn't assign ${grader.name}. Please verify there's a Greenhouse user with this name`
            );
        }
    }

    /**
     * Find two random graders for an application
     */
    private findRandomGraders(job: Job) {
        const graders = this.graders.filter(
            (grader: Grader) => grader.jobName == job.jobName
        );
        if (graders.length < this.gradersCount) {
            throw new UserError("Not enough graders to pick from");
        }

        // Shuffle graders array
        const shuffledGraders = graders.sort(() => 0.5 - Math.random());

        // Get sub-array of first elements to the graders count selected
        const selectedGraders = shuffledGraders.slice(0, this.gradersCount);

        return selectedGraders;
    }

    /**
     * Find current user name in UI
     */
    private async findUsername() {
        const currentUser = await this.page.$eval(
            "script[data-key='ZendeskConfig.userName']",
            (el) => (el as HTMLElement).dataset.value
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
        application: Application,
        graders: Grader[]
    ) {
        const selector = `.person[application="${application?.applicationID}"]`;
        let interviewCount = 0;

        // Click toggle button
        await this.page.waitForSelector(`${selector} .toggle-interviews`);
        await this.page.$eval(`${selector} .toggle-interviews`, (toggle) =>
            (toggle as HTMLAnchorElement).click()
        );

        // Check there is only one interviewer
        await this.page.waitForSelector(`${selector} tr.interview`);
        interviewCount = await this.page.$$eval(
            `${selector} tr.interview`,
            (interviewRows) => {
                return interviewRows.length;
            }
        );

        if (interviewCount !== 1) {
            return;
        }

        // Click edit
        await this.page.waitForSelector(
            `${selector} .edit-take-home-test-graders-link`
        );

        await this.page.$eval(
            `${selector} .edit-take-home-test-graders-link`,
            (btn) => (btn as HTMLAnchorElement).click()
        );

        // Wait for modal to open
        await this.page.waitForSelector("ul.chzn-choices", {
            visible: true,
        });

        // Click input field
        await this.page.waitForSelector(".search-field input[type='text']");
        await this.page.click(".search-field input[type='text']");

        // Delete current use assigned
        await this.page.keyboard.press("Backspace");
        await this.page.keyboard.press("Backspace");

        let outputMessage = `Written Interview from ${application.candidate} assigned to: `;

        // Type graders
        let comma = "";
        for (const grader of graders) {
            this.recordGrader(grader);
            await this.writeGrader(grader);
            outputMessage += `${comma}${grader.name}`;
            comma = ", ";
        }

        // Click save
        await this.page.click("input[type='submit']");

        this.spinner.stop();
        console.log(green("✔"), outputMessage);
        this.spinner.start();
    }

    /**
     * Record the grader for output reporting at the end of the action
     */
    private recordGrader(person: Grader) {
        const index = this.graderStore.findIndex(
            (e) => e.Grader === person.name
        );
        if (index === -1) {
            this.graderStore.push({
                Grader: person.name,
                Assignments: 1,
            });
        } else {
            this.graderStore[index].Assignments =
                this.graderStore[index].Assignments + 1;
        }
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
    
    /**
     * Sort the array by assignments
     */
    private compareAssignments(a: GraderRecord, b: GraderRecord) {
        return b.Assignments - a.Assignments;
    }

    public async execute(): Promise<void> {
        let allocationsCount = 0;
        for (const job of this.jobs) {
            const url = this.buildUrl(job);
            await this.page.goto(url, { waitUntil: "networkidle0" });
            await this.page.waitForSelector(".person");

            await this.findUsername();
            let page = 1;
            while (true) {
                this.spinner.start("Processing applications");
                const applicationsPage = await this.getApplicationsPage();
                for (const application of applicationsPage) {
                    if (application && application.toGrade) {
                        const graders = this.findRandomGraders(job);
                        await this.assignGradersToApplication(
                            application,
                            graders
                        );
                        allocationsCount++;
                    }
                }

                // Keep doing this until there are no more pages
                const nextPageBtn = await this.page.$(
                    "a.next_page:not(.disabled)"
                );
                if (!nextPageBtn) break;
                page++;
                await this.page.goto(url + `&page=${page}`, {
                    waitUntil: "networkidle0",
                });
            }
        }
        this.spinner.stop();
        if (allocationsCount) {
            console.log(
                green("✔"),
                `${allocationsCount} submissions were auto-assigned`
            );
            this.graderStore.sort(this.compareAssignments);
            console.table(this.graderStore);
            console.log(
                "Visit https://hiring.canonical.com/dashboards/performance to view historical team workload"
            );
        } else {
            console.log(green("✔"), `No submissions found to auto-assign`);
        }
    }
}
