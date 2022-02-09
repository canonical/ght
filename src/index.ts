import JobPost from "./automations/JobPost";
import SSO from "./automations/SSO";
import { Job } from "./common/types";
import { MAIN_URL, REGION } from "./common/constants";
import Puppeteer from "puppeteer";
import { green } from "colors";
import { Command, Argument, Option } from "commander";
import * as fs from "fs";

// async function addPosts(postID: number, region: string[], purge?: boolean, city?: string[], cloneFrom?: number) {
//     await postJobs.duplicate(jobData[0].posts[0], "test");
//     await postJobs.setStatus(jobData[0].posts[2], "live");
// }

async function main() {
    const program = new Command();

    const validateNumberParam = (param: string, fieldName: string) => {
        const intValue = parseInt(param);
        if (isNaN(intValue))
            throw new Error(`${fieldName} must be a number`);
        return intValue;
    }

    program
        .command("add-post")
        .addArgument(
            new Argument("<job-id>", "job to add job posts to")
                .argRequired()
                .argParser((value: string) => validateNumberParam(value, "job-id"))
        )
        .addOption(
            new Option("-p, --purge", "Delete job posts before creating job posts")
        )
        .addOption(
            new Option("-c, --clone-from <job-post-id>", "Clone job posts from the given post")
            .argParser((value) =>  validateNumberParam(value, "post-id"))
        )
        .addOption(
            new Option("--city <city-name>", "Add job posts to given city/cities")
            .argParser(async (value) => {
                const enteredCities = value.split(",");
                const data = fs.readFileSync(__dirname + "/common/countries.json", 'utf8');
                const cityData: {[key: string]: string[]}= JSON.parse(data);
                const cities: string[] = Object.values(cityData).reduce((arr1, arr2) => [...arr1, ...arr2]);

                const citiesToBeUsed: string[] = [];
                enteredCities.forEach((enteredCity) => {
                    const foundCity = cities.find(city => enteredCity.trim().toLowerCase() === city.toLowerCase()); 
                    if (!foundCity)
                        throw new Error(`Invalid city is entered: "${enteredCity}".`);
                    
                    citiesToBeUsed.push(foundCity);
                });
                return citiesToBeUsed;
            })
        )
        .requiredOption("--region <region-name>", "Add job posts to given region/s", (value) => {
            const regions: string[] = value.split(",");

            regions.forEach((enteredRegion) => {
                if(!REGION.find(region => region.match(new RegExp(enteredRegion, "i"))))
                    throw new Error(`Invalid region is entered: "${enteredRegion}". It must be one of the predefined regions: ${REGION.reduce((str1, str2) => `${str1}, ${str2}`)}`);
            });

            return regions;
        })
        .action(async (jobID, options) => {
            const sso = new SSO();
            const loginCookies = await sso.login();
            console.log(green("✓"), "Authentication complete");
        
            const browser = await Puppeteer.launch();
            const page = await browser.newPage();
            await sso.setCookies(page, loginCookies);
        
            const postJobs = new JobPost(page);
            const jobData = await postJobs.getJobData([jobID]);

            if (options.purge) {
                // call delete function
            }

            // start duplicating

            browser.close();
        });
    await program.parseAsync(process.argv);
}

main();
