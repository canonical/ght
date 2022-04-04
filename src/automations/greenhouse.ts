import { MAIN_URL } from "../common/constants";
import { joinURL } from "../common/pageUtils";
import { Page } from "puppeteer";

const STATUS_COLUMN_SELECTOR = ".person .toggle-interviews";
const WRITTEN_INTERVIEW_SELECTOR = ".edit-take-home-test-graders-link";

const STAGES = [
    "Application Review",
    "Written Interview",
    "Psychometric Assessment",
    "Meet & Greet",
    "Technical Exercise",
    "Early Stage Interviews",
    "HR Interview",
    "Late Stage Interviews",
    "Pre-Offer Checklist",
    "Executive Review",
    "Offer",
];

export async function writtenInterviews(
    page: Page,
    planId: string,
    pageNumber?: number
): Promise<any[]> {
    // const a = new Date();

    let url = joinURL(
        MAIN_URL,
        `/plans/${planId}/candidates?hiring_plan_id[]=${planId}&job_status=open&sort=last_activity+desc&stage_status_id=2&type=all`
    );
    if (pageNumber) url = `${url}&page=${pageNumber}`;
    STAGES.slice(1).forEach(
        (stage) => (url = `${url}&in_stages[]=${encodeURIComponent(stage)}`)
    );
    await page.goto(url, {
        waitUntil: "networkidle2",
    });

    // expand all tasks
    page.evaluate(
        ({ selector }) => {
            document.querySelectorAll(selector).forEach((e) => e.click());
        },
        { selector: STATUS_COLUMN_SELECTOR }
    );
    await page.waitForNetworkIdle();

    // get all written interviewers
    const result = await page.evaluate(
        ({ selector }) => {
            return Array.from(document.querySelectorAll(selector)).map((e) => ({
                reviewerName: e.previousSibling.textContent.match(
                    /to be graded by (?<name>.+), .* ago.*/i
                )?.groups?.name,
                applicationId: e.getAttribute("application_id"),
            }));
        },
        {
            selector: WRITTEN_INTERVIEW_SELECTOR,
        }
    );

    // console.log(
    //     `page ${pageNumber || 1} done in ${new Date().getTime() - a.getTime()}`
    // );
    // Check for pagination
    const pagesCount =
        (await page.$$("*[role='navigation'] *[href]")).length || 1;
    // set defaut page number
    pageNumber = pageNumber || 1;
    if (pageNumber < pagesCount) {
        return [
            ...result,
            ...(await writtenInterviews(page, planId, pageNumber + 1)),
        ];
    } else return result;
}
