import { evaluate, reportError, UserError } from "./processUtils";
import Puppeteer from "puppeteer";

export function getInnerText(
    element: Puppeteer.ElementHandle
): Promise<string> {
    return evaluate(element, (el: Element) => (el as HTMLElement).innerText);
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

export async function sendRequest(
    page: Puppeteer.Page,
    url: string,
    headers: { [key: string]: string },
    options: { [key: string]: string | null },
    errorMessage: string,
    isSuccessful: (response: { [key: string]: string }) => boolean
) {
    const response = await evaluate(
        page,
        async ({ url, headers, options, csrfToken }) => {
            try {
                const queryResponse: Response = await fetch(url, {
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
                });
                return queryResponse.ok
                    ? await queryResponse.json()
                    : {
                          isError: true,
                          status: queryResponse.status,
                          url: queryResponse.url,
                          statusText: queryResponse.statusText,
                      };
            } catch (e) {
                return e;
            }
        },
        {
            url,
            headers,
            options,
            csrfToken: await getCSRFToken(page),
        }
    );

    if (!response || response.isError || !isSuccessful(response)) {
        const errorToReport = response.isError
            ? `The server responded with a status of ${response.status} (${response.statusText}). URL: ${response.url}`
            : errorMessage;
        reportError(errorToReport);
        throw new UserError(errorMessage);
    }

    return response;
}

export async function getIDFromURL(
    element: Puppeteer.ElementHandle,
    selector: string
): Promise<number> {
    const url = await element.$eval(selector, (anchor: Element) =>
        anchor.getAttribute("href")
    );
    if (!url) throw new Error(`Cannot get ID from ${url}.`);
    const urlParts: string[] = url.split("/");
    return parseInt(urlParts[urlParts.length - 1]);
}
