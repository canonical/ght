import Puppeteer from "puppeteer";

export function getInnerText(element: Puppeteer.ElementHandle): Promise<string> {
    return element?.evaluate((el: Element) => (el as HTMLElement).innerText);
}
