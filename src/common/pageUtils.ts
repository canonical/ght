import Puppeteer, { ElementHandle } from "puppeteer";

export async function getIDFromURL(element: ElementHandle, selector: string): Promise<number> {
    const url = await element.$eval(selector, (anchor: any) => anchor.getAttribute('href'));
    const urlParts: string[] = ("" + url).split("/");
    return +urlParts[urlParts.length - 1]; 
}

export function getInnerText(element: Puppeteer.ElementHandle): Promise<string> {
    return element?.evaluate((el: Element) => (el as HTMLElement).innerText);
}
