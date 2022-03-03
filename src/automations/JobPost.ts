import {
    getCSRFToken,
    getIDFromURL,
    getInnerText,
    joinURL,
    sendRequest,
} from "../common/pageUtils";
import { FILTERED_ATTRIBUTES, MAIN_URL } from "../common/constants";
import { PostInfo } from "../common/types";
import Puppeteer, { ElementHandle } from "puppeteer";
import { blue } from "colors";
import { usaCities } from "../common/regions";

export default class JobPost {
    private page: Puppeteer.Page;

    constructor(page: Puppeteer.Page) {
        this.page = page;
    }

    public async getJobPostData(post: ElementHandle) {
        const postTitle = await post.$(".job-application__name");
        if (!postTitle) throw new Error("Post title cannot be found");

        const innerText = await getInnerText(postTitle);
        const titleLocationInfo = innerText
            .split("\n")
            .map((e: string) => e.trim())
            .filter((e: string) => !!e);

        const triggerBox = await post.$(".js-trigger-box");
        const jobPostID = await this.page.evaluate(
            (el) => el.getAttribute("data-job-id"),
            triggerBox
        );
        const postBoard = await post.$(".board-column");
        if (!postBoard) throw new Error("Post board cannot be found");

        const boardName = await getInnerText(postBoard);
        const boardID = await getIDFromURL(postBoard, "a");

        const postRowClassName: string = await (
            await post.getProperty("className")
        ).jsonValue();

        return {
            id: parseInt(jobPostID),
            name: titleLocationInfo[0],
            location: titleLocationInfo[1],
            boardInfo: {
                name: boardName,
                id: boardID,
            },
            isLive: postRowClassName.includes("live"),
        };
    }

    public isSuccessful = (response: { [key: string]: string }) =>
        !(response?.status === "success" || response?.success);

    public async deletePost(jobPost: PostInfo, referrer: string) {
        const url = joinURL(MAIN_URL, `/jobapps/${jobPost.id}`);

        await sendRequest(
            this.page,
            url,
            {
                "x-requested-with": "XMLHttpRequest",
            },
            {
                referrer,
                body: null,
                method: "DELETE",
            },
            `Failed to delete ${jobPost.name} | ${jobPost.location}`,
            this.isSuccessful
        );
    }

    public async getLocationInfo(location: string, jobPostID: number) {
        const cityName = location.split(",")[1];

        await this.page.goto(joinURL(MAIN_URL, `/jobapps/${jobPostID}/edit`));
        const accessTokenElement = await this.page.$(
            "*[data-key='LocationControl.Providers.Mapbox.apiKey']"
        );
        if (!accessTokenElement)
            throw new Error(
                "Data key to retrieve location information cannot be found."
            );
        const accessToken = await accessTokenElement.evaluate((node) =>
            node.getAttribute("data-value")
        );

        const response = await this.page.evaluate(
            async ({ url, referrer }) => {
                try {
                    return await (
                        await fetch(url, {
                            headers: {
                                accept: "*/*",
                                "accept-language": "en-US,en;q=0.9",
                            },
                            referrerPolicy: "strict-origin-when-cross-origin",
                            mode: "cors",
                            body: null,
                            method: "GET",
                            credentials: "omit",
                            referrer,
                        })
                    ).json();
                } catch {
                    return null;
                }
            },
            {
                url:
                    `https://api.mapbox.com/geocoding/v5/mapbox.places/${cityName}.json?access_token=${accessToken}` +
                    `&language=en&autocomplete=true&types=place%2Clocality&limit=10`,
                referrer: MAIN_URL,
            }
        );

        const locationInfoList = response["features"];
        if (!locationInfoList || !locationInfoList.length)
            throw new Error("Location infomation cannot be found.");
        const locationInfo = locationInfoList[0];
        const countryInfo = locationInfo["context"].find((info: any) =>
            info["id"].includes("country")
        );
        return {
            city: locationInfo["text"],
            country_long_name: countryInfo["text"],
            country_short_name: countryInfo["short_code"].toUpperCase(),
            country: countryInfo["text"],
            latitude: locationInfo["center"][1],
            location: locationInfo["place_name"],
            longitude: locationInfo["center"][0],
            state_long_name: locationInfo["text"],
            state_short_name: "",
            allow_remote: true,
        };
    }

    /**
     * Create a copy of a given job post and move it to the given location
     * @param jobPost the original job post
     * @param location the location to duplicate to
     * @param boardID the ID of the board that job post will be created with
     */
    public async duplicate(
        jobPost: PostInfo,
        location: string,
        boardID: number
    ): Promise<void> {
        const logName = `${blue(jobPost.name)} | ${blue(location)}`;
        const url = joinURL(
            MAIN_URL,
            `/plans/${jobPost.job.id}/jobapps/new?from=duplicate&greenhouse_job_application_id=${jobPost.id}`
        );
        await this.page.goto(url);

        const element = await this.page.$("*[data-react-class='JobPostsForm']");
        if (!element)
            throw new Error(
                "Failed to retrieve job post form details of " + logName
            );
        const jobPostFormRaw = await element.evaluate((node) =>
            node.getAttribute("data-react-props")
        );
        if (!jobPostFormRaw)
            throw new Error("Failed to retrieve job post form data " + logName);
        const jobPostForm = JSON.parse(jobPostFormRaw);
        // the pre filled job application that need modifications
        const jobApplication = jobPostForm["job_application"];
        // matching the expected payload for the POST request
        // rename attributes (old name: job_board_feed_settings)
        delete Object.assign(jobApplication, {
            job_board_feed_settings_attributes:
                jobApplication["job_board_feed_settings"],
        })["job_board_feed_settings"];
        delete Object.assign(jobApplication, {
            job_board_feed_location_attributes:
                jobApplication["job_board_feed_location"],
        })["job_board_feed_location"];
        delete Object.assign(jobApplication, {
            job_post_education_config_attributes:
                jobApplication["job_post_education_config"],
        })["job_post_education_config"];
        delete Object.assign(jobApplication, {
            questions_attributes: jobApplication["questions"],
        })["questions"];

        // the questions field needs a weird transformation
        // transform the array to object ({0: .., 1: .., ...})
        jobApplication.questions_attributes.map((question: any) => {
            question.answer_type_key = question.answer_type.key;
            delete question.answer_type;
            question.id = null;
        });
        jobApplication.questions_attributes = Object.assign(
            {},
            jobApplication.questions_attributes
        );

        // set the new location
        jobApplication.job_post_location.text_value = location;
        jobApplication.job_post_location.job_post_location_type = {
            id: 1,
            name: "Free Text",
            key: "FREE_TEXT",
        };

        jobApplication.job_post_location.custom_location = null;
        // set the title
        jobApplication.title = jobPost.name;

        // set the eeoc value if the location is in the USA
        const isInUSA = usaCities.find((city: string) => location === city);
        if (isInUSA) {
            jobApplication["enable_eeoc"] = true;
        }

        const payload = {
            external_or_internal_greenhouse_job_board_id: boardID,
            greenhouse_job_application: jobApplication,
            template_application_id: jobPost.id,
        };
        FILTERED_ATTRIBUTES.forEach((attr) => {
            delete payload.greenhouse_job_application[attr];
        });

        // Fill free job post board information, enable Indeed posts
        jobApplication["job_board_feed_settings_attributes"] = [
            {
                id: null,
                source_id: 7,
                include_in_feed: true,
            },
        ];
        // Set location information for free job post board section.
        const locationInfo = await this.getLocationInfo(location, jobPost.id);
        jobApplication["job_board_feed_location_attributes"] = locationInfo;

        FILTERED_ATTRIBUTES.forEach((attr) => {
            delete payload.greenhouse_job_application[attr];
        });

        await sendRequest(
            this.page,
            joinURL(MAIN_URL, `/plans/${jobPost.job.id}/jobapps`),
            {
                "content-type": "application/json;charset=UTF-8",
            },
            {
                referrer: url,
                body: JSON.stringify(payload),
                method: "POST",
            },
            "Failed to create " + logName,
            this.isSuccessful
        );
    }

    public async setStatus(jobPost: PostInfo, newStatus: "live" | "offline") {
        const logName = `${blue(jobPost.name)} | ${blue(jobPost.location)}`;
        const url = joinURL(MAIN_URL, `/plans/${jobPost.job.id}/jobapp`);
        await this.page.goto(url);

        const csrfToken = await getCSRFToken(this.page);
        await sendRequest(
            this.page,
            joinURL(MAIN_URL, `/jobapps/${jobPost.id}/status`),
            {
                "content-type":
                    "application/x-www-form-urlencoded; charset=UTF-8",
                "x-requested-with": "XMLHttpRequest",
            },
            {
                referrer: url,
                body: `utf8=%E2%9C%93&authenticity_token=${csrfToken}&job_application_status_id=${
                    newStatus === "live" ? 3 : 2
                }`,
                method: "POST",
            },
            "Failed to update the status of " + logName,
            this.isSuccessful
        );
    }
}
