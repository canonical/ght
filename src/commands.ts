import {
    LoginController,
    LogoutController,
    ReplicateController,
    RepostController,
    ResetController,
    AssignGradersController,
} from "./controllers";
import { validateNumberParam } from "./utils/commandUtils";
import { UserError } from "./utils/processUtils";
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
    program.option("--new", "Use alternative authentication implementation");
    program.option(
        "--record",
        "Record the Puppeteer session. For debugging purposes.",
    );

    // Login command
    program
        .command("login")
        .description("Login and save credentials")
        .action(async () => {
            const controller = new LoginController(program);
            try {
                await controller.run();
            } catch (error) {
                throw new UserError(`Error during login: ${error}`);
            } finally {
                await controller.stopRecording();
            }
        });

    // Logout command
    program
        .command("logout")
        .description("Remove saved credentials")
        .action(async () => {
            const controller = new LogoutController(program);
            try {
                await controller.run();
            } catch (error) {
                throw new UserError(`Error during logout: ${error}`);
            } finally {
                await controller.stopRecording();
            }
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
            const controller = new ReplicateController(
                program,
                jobPostId,
                options,
            );
            try {
                await controller.run();
            } catch (error) {
                throw new UserError(`Error replicating job post: ${error}`);
            } finally {
                await controller.stopRecording();
            }
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
            const controller = new ResetController(program, jobPostID, options);
            try {
                await controller.run();
            } catch (error) {
                throw new UserError(`Error resetting job posts: ${error}`);
            } finally {
                await controller.stopRecording();
            }
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
            const controller = new RepostController(
                program,
                jobPostID,
                options,
            );
            try {
                await controller.run();
            } catch (error) {
                throw new UserError(`Error reposting job: ${error}`);
            } finally {
                await controller.stopRecording();
            }
        });

    // Assign command
    program
        .command("assign")
        .usage(
            "([-i | --interactive])" +
                "\n\n Examples: \n\t ght assign --interactive" +
                " \n\t ght assign --interactive --unassigned",
        )
        .description(
            "Assign graders to written interviews for the jobs selected.\n" +
                "Graders are randomly picked from a ght-graders.yml file defined in your home directory",
        )
        .addOption(
            new Option("-i, --interactive", "Enable interactive interface"),
        )
        .addOption(
            new Option(
                "-u, --unassigned",
                "Only assign interviews that do not have an assignee enabled in ght-graders.yml",
            ),
        )
        .action(async (options) => {
            const controller = new AssignGradersController(program, options);
            try {
                await controller.run();
            } catch (error) {
                throw new UserError(`Error assigning graders: ${error}`);
            } finally {
                await controller.stopRecording();
            }
        });

    return program;
}

export default makeProgram;
