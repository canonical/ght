import {
    LoginController,
    LogoutController,
    ReplicateController,
    RepostController,
    ResetController,
    AssignGradersController,
} from "./controllers";
import { validateNumberParam } from "./utils/commandUtils";
import { Command, Argument, Option } from "commander";

function makeProgram(): Command {
    const program = new Command();
    program.description(
        "GHT is a command-line tool that provides helpers to automate " +
            "interactions with the Canonical Greenhouse website.",
    );
    // Global options
    program.option(
        "-c, --config <path>",
        "Path to a custom config file path that will be used to override default values",
    );
    program.option(
        "--new",
        "Use the new Ubuntu SSO for authentication.",
    );

    // Login command
    program
        .command("login")
        .description("Login and save credentials")
        .action(async () => {
            await new LoginController(program).run();
        });

    // Logout command
    program
        .command("logout")
        .description("Remove saved credentials")
        .action(async () => {
            await new LogoutController(program).run();
        });

    // Replicate command
    program
        .command("replicate")
        .usage(
            "([-i | --interactive] | <job-post-id> --regions=<region-name>[, <region-name-2>...])" +
                "\n\n Examples: \n\t ght replicate --interactive " +
                "\n \t ght replicate 1234 --regions=emea,americas",
        )
        .description(
            "Create job post for a specific job in the specified regions from all existing " +
                "job posts in the Canonical Board",
        )
        .addArgument(
            new Argument(
                "<job-post-id>",
                "ID of a job post that will be cloned from",
            )
                .argOptional()
                .argParser((value: string) =>
                    validateNumberParam(value, "job post id"),
                ),
        )
        .addOption(
            new Option(
                "-r, --regions <region-name>",
                "Add job posts to given region/s",
            ),
        )
        .addOption(
            new Option("-i, --interactive", "Enable interactive interface"),
        )
        .action(async (jobPostId, options) => {
            await new ReplicateController(program, jobPostId, options).run();
        });

    // Reset command
    program
        .command("reset")
        .usage(
            "([-i | --interactive] | <job-post-id> --regions=<region-name>[, <region-name-2>...])" +
                " \n\n Examples: \n\t ght reset --interactive " +
                "\n\t ght reset 1234 --regions=emea,americas",
        )
        .description("Delete job posts of the given job")
        .addArgument(
            new Argument(
                "<job-post-id>",
                "Delete job posts that have same name with the given post",
            )
                .argOptional()
                .argParser((value: string) =>
                    validateNumberParam(value, "job-post-id"),
                ),
        )
        .addOption(
            new Option(
                "-r, --regions <region-name>",
                "Delete job posts that are in the given region",
            ),
        )
        .addOption(
            new Option("-i, --interactive", "Enable interactive interface"),
        )
        .action(async (jobPostID, options) => {
            await new ResetController(program, jobPostID, options).run();
        });

    // Repost command
    program
        .command("repost")
        .usage(
            "([-i | --interactive] | <job-post-id>)" +
                " \n\n Examples: \n\t ght repost --interactive " +
                "\n\t ght repost 1234",
        )
        .description("Repost and delete a given job post")
        .addArgument(
            new Argument(
                "<job-post-id>",
                "ID of a job post that will be cloned and deleted",
            )
                .argOptional()
                .argParser((value: string) =>
                    validateNumberParam(value, "job-post-id"),
                ),
        )
        .addOption(
            new Option("-i, --interactive", "Enable interactive interface"),
        )
        .action(async (jobPostID, options) => {
            await new RepostController(program, jobPostID, options).run();
        });

    // Assign command
    program
        .command("assign")
        .usage(
            "([-i | --interactive])" +
                "\n\n Examples: \n\t ght assign --interactive",
        )
        .description(
            "Assign graders to written interviews for the jobs selected.\n" +
                "Graders are randomly picked from a ght-graders.yml file defined in your home directory",
        )
        .addOption(
            new Option("-i, --interactive", "Enable interactive interface"),
        )
        .action(async (options) => {
            await new AssignGradersController(program, options).run();
        });

    return program;
}

export default makeProgram;
