import makeProgram from "../commands";
import { ReplicateController, ResetController } from "../controllers";

const program = makeProgram();

describe("Replicate", () => {
    it("throw an error if the region is not valid", () => {
        expect(() => {
            new ReplicateController(program, 1234, { regions: "invalid" });
        }).toThrowError(/Invalid region/i);
    });
});

describe("Reset", () => {
    it("throw an error if the region is not valid", () => {
        expect(() => {
            new ResetController(program, 1234, { regions: "invalid" });
        }).toThrowError(/Invalid region/i);
    });
});
