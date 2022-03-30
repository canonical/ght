import { writtenInterviews } from "./automations/greenhouse";
import SSO from "./automations/sso";

async function main() {
    try {
        const sso = new SSO();
        const { browser } = await sso.authenticate();
        console.log(
            await writtenInterviews("1753301", await browser.newPage())
        );
        console.log("done");
        await browser.close();
    } catch (e) {
        console.error(e);
    }
}

main();
