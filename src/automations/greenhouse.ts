import { MAIN_URL } from "../common/constants";
import { joinURL } from "../common/pageUtils";
import { Page } from "puppeteer";

const STATUS_COLUMN_SELECTOR = ".person .toggle-interviews";
const WRITTEN_INTERVIEW_SELECTOR = ".edit-take-home-test-graders-link";

export async function writtenInterviews(
    planId: string,
    page: Page,
    pageNumber?: number
): Promise<any[]> {
    const a = new Date();

    let url = joinURL(
        MAIN_URL,
        `plans/${planId}/candidates?sort=last_activity+desc&type=all&job_status=all`
        // ?hiring_plan_id=${planId}&job_status=open&sort=last_activity+desc&stage_status_id=2&type=all`
    );
    if (pageNumber) url = `${url}&page=${pageNumber}`;
    await page.goto(url, {
        waitUntil: "networkidle2",
    });

    // expand all tasks
    page.evaluate(
        ({ selector }) => {
            document.querySelectorAll(selector).forEach((e) => {
                // only expand written applications
                if (e.textContent.match(/ due from /i)) e.click();
            });
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

    console.log("done in:", new Date().getTime() - a.getTime());
    // Check for pagination
    const pagesCount =
        (await page.$$("*[role='navigation'] *[href]")).length || 1;
    // set defaut page number
    pageNumber = pageNumber || 1;
    if (pageNumber < pagesCount) {
        return [
            ...result,
            ...(await writtenInterviews(planId, page, pageNumber + 1)),
        ];
    } else return result;
}
