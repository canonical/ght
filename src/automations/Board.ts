import { MAIN_URL } from "../common/constants";
import { joinURL, sendRequest } from "../common/pageUtils";
import { BaseInfo } from "../common/types";
import Puppeteer from "puppeteer";

export default class Board {
    private page: Puppeteer.Page;

    constructor(page: Puppeteer.Page) {
        this.page = page;
    }

    public async getBoards(): Promise<BaseInfo[]> {
        const response = await sendRequest(
            this.page,
            joinURL(MAIN_URL, "/jobboard/get_boards"),
            {},
            {
                referrer: joinURL(MAIN_URL, "/jobboard"),
                body: null,
                method: "GET",
            },
            "Boards cannot be retrieved.",
            (queryResult) => !queryResult
        );

        return response["job_boards"].map((board: any) => ({
            id: board["id"],
            name: board["company_name"],
        }));
    }
}
