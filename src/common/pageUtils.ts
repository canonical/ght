export async function gotoURL(page: any, url: string) {
    await page.goto(url);
    await page.waitForNetworkIdle();
}

export async function getIDFromURL(element: any, selector: string) {
    const url = await element.$eval(selector, (anchor: any) => anchor.getAttribute('href'));
    const urlParts = url.split("/");
    return urlParts[urlParts.length - 1]; 
}

export function getInnerText(element: any) {
    return element.evaluate((el: any) => el.innerText);
}
