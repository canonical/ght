import { Application, Grader, JobToAssign, GraderRecord } from "./types";
import { UserError } from "../utils/processUtils";
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
    private jobs: JobToAssign[];
    private spinner: Ora;
    private currentUser = "";
    private gradersCount = 2;
    private graderStore: GraderRecord[] = [];
    private greenhouseUrl: string;
    private stage: string;
    private allocationsCount = 0;
    private onlyUnassigned: boolean = false;

    constructor(
        page: Page,
        graders: Grader[],
        selectedJobs: JobToAssign[],
        spinner: Ora,
        gradersCount: number,
        greenhouseUrl: string,
        stage: string,
        onlyUnassigned: boolean,
    ) {
        this.page = page;
        this.graders = graders;
        this.jobs = selectedJobs;
        this.spinner = spinner;
        this.gradersCount = gradersCount;
        this.greenhouseUrl = greenhouseUrl;
        this.stage = stage;
        this.onlyUnassigned = onlyUnassigned;
    }

    /**
     * Return applications in current page
     */
    private async getApplicationsPage() {
        return await this.page.$$eval(
            ".person",
            (people) => {
                return people.map((p) => {
                    const applicationID = p.getAttribute("application");
                    const candidate = p.querySelector(".name a")?.textContent;
                    if (applicationID && candidate) {
                        return {
                            applicationID,
                            candidate,
                        };
                    }
                });
            },
            this.currentUser,
        );
    }

    /**
     * Type grader's name
     */
    private async writeGrader(grader: Grader) {
        await this.page.type(".search-field input[type='text']", grader.name);
        await this.page.keyboard.press("Enter");

        // Make sure that the user was correctly assigned
        const gradersAssigned = await this.getAssignedGraders();
        if (!gradersAssigned.includes(grader.name)) {
            throw new UserError(
                `Couldn't assign ${grader.name}. Please verify there's a Greenhouse user with this name`,
            );
        }
    }

    /**
     * Get currently assigned graders
     */
    private async getAssignedGraders() {
        return await this.page.$$eval("ul .search-choice span", (el) =>
            el.map((grader) => grader.textContent),
        );
    }

    /**
     * Returns true if assigned graders has at least graders count
     * of already assigned graders.
     *
     * Example:
     *   Grader Count: 2
     *   Graders: ['Janet', 'Rosco', 'Joe', 'Jill]
     *   Currently assigned Graders: ['Rosco', 'Jill'] => true
     *   Currently assigned Graders: ['Bill'] => false
     *   Currently assigned Graders: ['Janet', 'Joe', 'Jill'] => false
     */
    private async gradersAlreadyAssigned() {
        const gradersAssigned = await this.getAssignedGraders();
        const seenGraders = this.graders.filter((g) =>
            gradersAssigned.includes(g.name),
        ).length;

        return seenGraders >= 1 && seenGraders === this.gradersCount;
    }

    /**
     * Find two random graders for an application
     */
    private findRandomGraders(job: JobToAssign) {
        const graders = this.graders.filter(
            (grader: Grader) => grader.jobName == job.jobName,
        );
        if (graders.length < this.gradersCount) {
            throw new UserError("Not enough graders to pick from");
        }

        // Shuffle graders array
        const shuffledGraders = graders
            .map((grader) => ({ grader, weight: Math.random() }))
            .sort((a, b) => a.weight - b.weight)
            .map(({ grader }) => grader);

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
            (el) => (el as HTMLElement).dataset.value,
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
        graders: Grader[],
    ) {
        const selector = `.person[application="${application?.applicationID}"]`;
        let interviewCount = 0;

        // Check there is only one interviewer
        await this.page.waitForSelector(`${selector} tr.interview`);
        interviewCount = await this.page.$$eval(
            `${selector} tr.interview`,
            (interviewRows) => {
                return interviewRows.length;
            },
        );

        if (interviewCount !== 1) {
            return;
        }

        // Click edit
        await this.page.waitForSelector(
            `${selector} .edit-take-home-test-graders-link`,
        );

        await this.page.$eval(
            `${selector} .edit-take-home-test-graders-link`,
            (btn) => (btn as HTMLAnchorElement).click(),
        );

        // Check the graders input is visible
        await this.page.waitForSelector(
            "#edit_take_home_test_graders_modal .search-field input",
            {
                visible: true,
            },
        );

        const gradersAssigned =
            this.onlyUnassigned && (await this.gradersAlreadyAssigned());
        if (gradersAssigned) {
            const outputMessage = `Skipping assignment for ${application.candidate} because it is already assigned`;
            this.spinner.stop();
            console.log(green("✔"), outputMessage);
            this.spinner.start();
            const cancelSelector = "a.cancel";
            await this.page.waitForSelector(cancelSelector);
            await this.page.click(cancelSelector);
        } else {
            // Click the graders input
            await this.page.click(
                "#edit_take_home_test_graders_modal .search-field input",
            );

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

            // Click save and await POST response
            // POST is to this endpoint:
            // https://canonical.greenhouse.io/interviews/take_home_test/graders
            await Promise.all([
                this.page.waitForResponse(
                    (response) =>
                        response
                            .url()
                            .includes("/interviews/take_home_test/graders") &&
                        response.request().method() === "POST",
                ),
                this.page.click("input[type='submit']#save_graders"),
            ]);

            // Wait for the modal to disappear
            await this.page.waitForSelector(
                "#edit_take_home_test_graders_modal",
                { hidden: true, timeout: 10000 },
            );

            this.allocationsCount++;

            this.spinner.stop();
            console.log(green("✔"), outputMessage);
            this.spinner.start();

            await this.page.reload();
        }
    }

    /**
     * Record the grader for output reporting at the end of the action
     */
    private recordGrader(person: Grader) {
        const index = this.graderStore.findIndex(
            (e) => e.Grader === person.name,
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
    private buildUrl(job: JobToAssign) {
        const url = new URL(`${this.greenhouseUrl}/people`);
        url.searchParams.append("stage_status_id", "2");
        url.searchParams.append("take_home_test_status_id", "9");
        url.searchParams.append("in_stages", this.stage);
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
        for (const job of this.jobs) {
            const url = this.buildUrl(job);
            await this.page.goto(url, { waitUntil: "networkidle0" });

            await this.findUsername();
            let page = 1;
            while (true) {
                this.spinner.start("Processing applications");
                const applicationsPage = await this.getApplicationsPage();
                for (const application of applicationsPage) {
                    if (application) {
                        const graders = this.findRandomGraders(job);
                        await this.assignGradersToApplication(
                            application,
                            graders,
                        );
                    }
                }

                // Keep doing this until there are no more pages
                const nextPageBtn = await this.page.$(
                    "a.next_page:not(.disabled)",
                );
                if (!nextPageBtn) break;
                page++;
                await this.page.goto(url + `&page=${page}`, {
                    waitUntil: "networkidle0",
                });
            }
        }
        this.spinner.stop();
        if (this.allocationsCount) {
            console.log(
                green("✔"),
                `${this.allocationsCount} submissions were auto-assigned`,
            );
            this.graderStore.sort(this.compareAssignments);
            console.table(this.graderStore);
            console.log(
                "Visit https://hiring.canonical.com/dashboards/performance to view historical team workload",
            );
        } else {
            console.log(green("✔"), `No submissions found to auto-assign`);
        }
    }
}
