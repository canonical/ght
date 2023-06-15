import makeProgram from "../commands";
import {
    LoginController,
    LogoutController,
    ReplicateController,
    ResetController,
    AssignGradersController,
} from "../controllers";
import { Command } from "commander";

jest.mock("../controllers");

describe("CLI", () => {
    let program: Command;
    beforeEach(() => {
        program = makeProgram();
    });

    it("show help", async () => {
        const writeSpy = jest
            .spyOn(process.stdout, "write")
            .mockImplementation(() => true);
        program.exitOverride();

        expect(() => {
            program.parse(["node", "index.js", "--help"]);
        }).toThrow("(outputHelp)");
        writeSpy.mockClear();
    });

    it("run login", async () => {
        program.parse(["node", "index.js", "login"]);
        expect(LoginController).toHaveBeenCalledWith(program);
    });

    it("run logout command", () => {
        program.parse(["node", "index.js", "logout"]);
        expect(LogoutController).toHaveBeenCalledWith(program);
    });

    it("run replicate command", () => {
        program.parse([
            "node",
            "index.js",
            "replicate",
            "12345",
            "--regions=emea,americas",
        ]);
        expect(ReplicateController).toHaveBeenCalledWith(program, 12345, {
            regions: "emea,americas",
        });
    });

    it("run replicate command", () => {
        program.parse([
            "node",
            "index.js",
            "replicate",
            "12345",
            "--regions=emea,americas",
        ]);
        expect(ReplicateController).toHaveBeenCalledWith(program, 12345, {
            regions: "emea,americas",
        });
    });

    it("run reset command", () => {
        program.parse([
            "node",
            "index.js",
            "reset",
            "12345",
            "--regions=emea,americas",
        ]);
        expect(ResetController).toHaveBeenCalledWith(program, 12345, {
            regions: "emea,americas",
        });
    });

    it("run assign command", () => {
        program.parse(["node", "index.js", "assign", "-i"]);
        expect(AssignGradersController).toHaveBeenCalledWith(program, {
            interactive: true,
        });
    });
});
