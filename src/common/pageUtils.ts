import SSO from "../automations/SSO";
import { green } from "colors";
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

export async function authenticate() {
    const sso = new SSO();
    const loginCookies = await sso.login();
    console.log(green("✓"), "Authentication complete");

    const browser = await Puppeteer.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await sso.setCookies(page, loginCookies);

    return {
        browser,
        page,
    };
}

export async function sendRequest(
    page: Puppeteer.Page,
    url: string,
    headers: { [key: string]: string },
    options: { [key: string]: string | null },
    errorMessage: string,
    isSuccessful: (response: { [key: string]: string }) => boolean
) {
    const response = await page.evaluate(
        async ({ url, headers, options, csrfToken }) => {
            try {
                return await (
                    await fetch(url, {
                        headers: {
                            accept: "application/json, text/javascript, */*; q=0.01",
                            "accept-language": "en-US,en;q=0.9,fr;q=0.8",
                            "x-csrf-token": csrfToken,
                            ...headers,
                        },
                        referrerPolicy: "strict-origin-when-cross-origin",
                        mode: "cors",
                        credentials: "include",
                        ...options,
                    })
                ).json();
            } catch {
                return null;
            }
        },
        {
            url,
            headers,
            options,
            csrfToken: await getCSRFToken(page),
        }
    );

    if (isSuccessful(response)) throw new Error(errorMessage);

    return response;
}
