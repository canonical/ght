import { BaseController } from "./BaseController";
import { Command } from "commander";

export class LogoutController extends BaseController {
    constructor(command: Command) {
        super(command);
    }

    async run() {
        this.auth.logout();
    }
}
