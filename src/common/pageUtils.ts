import { BaseInfo } from "./types";
import { MAIN_URL } from "./constants";
import Puppeteer from "puppeteer";

export function getInnerText(
    element: Puppeteer.ElementHandle
): Promise<string> {
    return element?.evaluate((el: Element) => (el as HTMLElement).innerText);
}

export function getCSRFToken(page: Puppeteer.Page): Promise<string> {
    // CSRF token should be put in the request's header.
    return page.$eval(
        "head > meta[name=csrf-token]",
        (element) => (element as HTMLMetaElement).content
    );
}

export function joinURL(baseURL: string, relativeURL: string) {
    return new URL(relativeURL, baseURL).href;
}

export async function getBoards(page: Puppeteer.Page): Promise<BaseInfo[]> {
    const response = await page.evaluate(
        async ({ url, csrfToken, referrer }) => {
            try {
                return await (
                    await fetch(url, {
                        headers: {
                            accept: "application/json, text/javascript, */*; q=0.01",
                            "accept-language": "en-US,en;q=0.9,fr;q=0.8",
                            "x-csrf-token": csrfToken,
                        },
                        referrerPolicy: "strict-origin-when-cross-origin",
                        mode: "cors",
                        credentials: "include",
                        referrer,
                        body: null,
                        method: "GET",
                    })
                ).json();
            } catch (e) {
                console.log(e);
                return null;
            }
        },
        {
            url: joinURL(MAIN_URL, "/jobboard/get_boards"),
            csrfToken: await getCSRFToken(page),
            referrer: joinURL(MAIN_URL, "/jobboard"),
        }
    );

    if (!response) throw new Error("Boards cannot be retrieved.");

    return response["job_boards"].map((board: any) => ({
        id: board["id"],
        name: board["company_name"],
    }));
}
