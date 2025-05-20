import { JobBoard, JobInfo, PostInfo } from "./types";
import { usaCities } from "../config/defaults";
import {
    clearPopups,
    getCSRFToken,
    getIDFromURL,
    getInnerText,
    joinURL,
    sendRequest,
} from "../utils/pageUtils";
import Config from "../config/Config";
import { evaluate } from "../utils/processUtils";
import * as Puppeteer from "puppeteer";
import { ElementHandle } from "puppeteer";
import { blue } from "colors";

export default class JobPost {
    private page: Puppeteer.Page;
    private config: Config;

    constructor(page: Puppeteer.Page, config: Config) {
        this.page = page;
        this.config = config;
    }

    public async getJobPostData(post: ElementHandle) {
        const postTitle = await post.$(".job-application__name");
        if (!postTitle)
            throw new Error(`Post title cannot be found in ${this.page.url()}`);

        const innerText = await getInnerText(postTitle);
        const titleLocationInfo = innerText
            .split("\n")
            .map((e: string) => e.trim())
            .filter((e: string) => !!e);

        const triggerBox = await post.$(".js-trigger-box");
        const jobPostID = await evaluate(
            this.page,
            (el) => el?.getAttribute("data-job-id"),
            triggerBox,
        );
        if (!jobPostID)
            throw new Error(
                `Post information cannot be found in ${this.page.url()}.`,
            );

        const postBoard = await post.$(".board-column");
        if (!postBoard)
            throw new Error(`Post board cannot be found in ${this.page.url()}`);

        const boardName = await getInnerText(postBoard);
        const boardID = await getIDFromURL(postBoard, "a");

        const postRowClassName: string = await (
            await post.getProperty("className")
        ).jsonValue();

        return {
            id: parseInt(jobPostID),
            name: titleLocationInfo[0],
            // Remove surrounding parentheses
            location: titleLocationInfo[1].replace(/\(|\)/g, ""),
            boardInfo: {
                name: boardName,
                id: boardID,
            },
            isLive: postRowClassName.includes("live"),
        };
    }

    public isSuccessful = (response: { [key: string]: string }) =>
        !!(response?.status === "success" || response?.success);

    public async deletePost(jobPost: PostInfo, jobData: JobInfo) {
        const url = joinURL(
            this.config.greenhouseUrl,
            `/jobapps/${jobPost.id}`,
        );
        const referrer = joinURL(
            this.config.greenhouseUrl,
            `/plans/${jobData.id}/jobapp`,
        );

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
            this.isSuccessful,
        );
    }

    public async getLocationInfo(location: string) {
        const locationArr = location.split(",");
        locationArr.shift();
        const cityName = locationArr.reduce((str1, str2) => `${str1}, ${str2}`);

        const accessTokenElement = await this.page.$(
            "*[data-key='LocationControl.Providers.Mapbox.apiKey']",
        );
        if (!accessTokenElement)
            throw new Error(
                "Data key to retrieve location information cannot be found.",
            );
        const accessToken = await evaluate(accessTokenElement, (node) =>
            node.getAttribute("data-value"),
        );

        const response = await evaluate(
            this.page,
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
                referrer: this.config.greenhouseUrl,
            },
        );

        if (!response) {
            throw new Error(
                `Failed to retrieve location information for ${cityName}.`,
            );
        }

        const locationInfoList = response["features"];
        if (!locationInfoList || !locationInfoList.length)
            throw new Error(
                `Location infomation cannot be found for ${cityName}.`,
            );
        const locationInfo = locationInfoList[0];
        const contextInformation = locationInfo["context"]?.find((info: any) =>
            info["id"].includes("country"),
        );
        const countryInfo = contextInformation
            ? {
                  country_long_name: contextInformation["text"],
                  country_short_name:
                      contextInformation["short_code"].toUpperCase(),
              }
            : {
                  country_long_name: locationInfo["text"],
                  country_short_name:
                      locationInfo["properties"]["short_code"].toUpperCase(),
              };

        return {
            city: locationInfo["text"],
            ...countryInfo,
            latitude: locationInfo["center"][1],
            location: locationInfo["place_name"],
            longitude: locationInfo["center"][0],
            state_long_name: locationInfo["text"],
            state_short_name: "",
            allow_remote: true,
            county: "",
        };
    }

    /**
     * Create a copy of a given job post and move it to the given location
     * @param jobPost the original job post
     * @param location the location to duplicate to
     * @param board the board that job post will be created on
     */
    public async duplicate(
        jobPost: PostInfo,
        location: string,
        board: any,
    ): Promise<void> {
        const logName = `${blue(jobPost.name)} | ${blue(location)}`;
        const url1 = joinURL(
            this.config.greenhouseUrl,
            `/jobapps/${jobPost.id}/edit`,
        );
        await this.page.goto(url1);
        await clearPopups(this.page);

        const element = await this.page.$("*[data-react-class='JobPostsForm']");
        if (!element)
            throw new Error(
                "Failed to retrieve job post form details of " + logName,
            );

        const jobPostFormRaw = await evaluate(element, (node) =>
            node.getAttribute("data-react-props"),
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
        jobApplication.questions_attributes.forEach((question: any) => {
            question.answer_type_key = question.answer_type.key;
            delete question.answer_type;
            question.id = null;
            if (question["question_options"]?.length > 0) {
                const options = question["question_options"]
                    .map((question: { label: string }) => question.label)
                    .reduce((str1: string, str2: string) => str1 + "\n" + str2);
                delete Object.assign(question, {
                    question_options_text: options,
                })["question_options"];
            }
            if (question["linked_candidate_field"]) {
                delete question["linked_candidate_field"]["id"];
                delete question["linked_candidate_field"]["question_id"];
                delete question["linked_candidate_field"]["name"];

                delete Object.assign(question, {
                    linked_candidate_field_attributes:
                        question["linked_candidate_field"],
                })["linked_candidate_field"];
            } else {
                delete question["linked_candidate_field"];
            }
        });

        jobApplication.questions_attributes = Object.assign(
            {},
            jobApplication.questions_attributes,
        );

        // set the new location
        jobApplication.job_post_locations[0].text_value = location;
        if (
            jobApplication.job_post_locations[0].job_post_location_type.key !==
            "FREE_TEXT"
        ) {
            jobApplication.job_post_locations[0].job_post_location_type = {
                id: 1,
                name: "Free Text",
                key: "FREE_TEXT",
            };
        }
        jobApplication.job_post_locations[0].custom_location = null;
        // set the title
        jobApplication.title = jobPost.name;

        // set the eeoc value if the location is in the USA
        const isInUSA = usaCities.find((city: string) => location === city);
        jobApplication["enable_eeoc"] = isInUSA;

        // Fill free job post board information, enable Indeed posts
        jobApplication["job_board_feed_settings_attributes"] = jobApplication[
            "job_board_feed_settings_attributes"
        ]
            .filter((i: any) => i.source_key === "INDEED")
            .map(({ source_id, include_in_feed }: any) => ({
                id: null,
                source_id: source_id,
                include_in_feed: include_in_feed,
            }));

        // Set location information for free job post board section.
        const locationInfo = await this.getLocationInfo(location);
        jobApplication["job_board_feed_location_attributes"] = locationInfo;
        jobApplication["job_post_education_config_attributes"]["id"] = null;

        const payload = {
            external_or_internal_greenhouse_job_board_id: board.id,
            greenhouse_job_application: jobApplication,
            template_application_id: jobPost.id,
        };
        this.config.filteredAttributes.forEach((attr) => {
            delete payload.greenhouse_job_application[attr];
        });

        await sendRequest(
            this.page,
            joinURL(
                this.config.greenhouseUrl,
                `/plans/${jobPost.job.id}/jobapps`,
            ),
            {
                "content-type": "application/json;charset=UTF-8",
            },
            {
                referrer: url1,
                body: JSON.stringify(payload),
                method: "POST",
            },
            "Failed to create " + logName,
            this.isSuccessful,
        );
    }

    public async setStatus(
        jobPost: PostInfo,
        newStatus: "live" | "offline",
        boardToPost: JobBoard,
    ) {
        const logName = `${blue(jobPost.name)} | ${blue(jobPost.location)}`;
        const url = joinURL(
            this.config.greenhouseUrl,
            `/plans/${jobPost.job.id}/jobapp`,
        );
        await this.page.goto(url);
        await clearPopups(this.page);

        const csrfToken = await getCSRFToken(this.page);
        await sendRequest(
            this.page,
            joinURL(this.config.greenhouseUrl, `/jobapps/${jobPost.id}/status`),
            {
                "content-type":
                    "application/x-www-form-urlencoded; charset=UTF-8",
                "x-requested-with": "XMLHttpRequest",
            },
            {
                referrer: url,
                body: `utf8=%E2%9C%93&authenticity_token=${csrfToken}&job_application_status_id=${
                    newStatus === "live"
                        ? boardToPost.publishStatusId
                        : boardToPost.unpublishStatusId
                }`,
                method: "POST",
            },
            "Failed to update the status of " + logName,
            this.isSuccessful,
        );
    }
}
