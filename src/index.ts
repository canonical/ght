import { writtenInterviews } from "./automations/greenhouse";
import SSO from "./automations/sso";
import express from "express";
import { Page } from "puppeteer";
import { Cluster } from "puppeteer-cluster";

async function main() {
    const cluster = await Cluster.launch({
        // Important option, see docs for more info: https://github.com/gsidsid/puppeteer-cluster#concurrency-implementations
        concurrency: Cluster.CONCURRENCY_PAGE,
        // for CONCURRENCY_PAGE, max concurrency is the max amount of tabs open
        maxConcurrency: 5,
        monitor: false, // show interactif log (set to false in prod)
        timeout: 30000, // fail a task after 30 seconds
        puppeteerOptions: { headless: true },
    });

    await cluster.task(
        async ({ page, data: jobId }: { page: Page; data: string }) => {
            await new SSO().authenticate(page);
            return await writtenInterviews(page, jobId);
        }
    );
    // async mode
    // await cluster.queue("1753301");

    // sync
    // console.log(await cluster.execute("1753301"));

    const app = express();

    // setup server
    app.get("/", async function (req, res) {
        const jobId = req.query["job-id"];
        if (!jobId) {
            return res.end("Please specify job-id like this: ?job-id=1753301");
        }
        try {
            const writtenInterviews = await cluster.execute(jobId);
            res.json(writtenInterviews);
        } catch (err) {
            // catch error
            res.end("Error: " + err);
        }
    });

    app.listen(3000, function () {
        console.log("Screenshot server listening on port 3000.");
    });
}

main();
