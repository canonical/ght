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
