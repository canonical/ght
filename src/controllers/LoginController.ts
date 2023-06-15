import { BaseController } from "./BaseController";
import { Command } from "commander";

export class LoginController extends BaseController {
    constructor(command: Command) {
        super(command);
    }

    async run() {
        const { browser, page } = await this.getPuppeteer();
        await this.auth.login(page);
        await browser.close();
    }
}
