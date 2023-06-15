import { displayError, setupSentry } from "./utils/processUtils";
import makeProgram from "./commands";
import ora from "ora";

async function main() {
    setupSentry();

    try {
        const program = makeProgram();
        await program.parseAsync(process.argv);
    } catch (error) {
        const spinner = ora();
        displayError(error as Error, spinner);
        process.exit(1);
    }
}

main();
