import Puppeteer from "puppeteer";

async function helloWorldPuppeteer() {
    const browser = await Puppeteer.launch();
    const page = await browser.newPage();
    page.setCookie({
        name: "_cookies_accepted",
        value: "all",
        domain: "canonical.com",
    });
    await page.goto("https://canonical.com");
    await page.waitForNetworkIdle();

    await page.screenshot({ path: "screenshot.png" });

    await browser.close();
}
helloWorldPuppeteer();
