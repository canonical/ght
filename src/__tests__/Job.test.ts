import * as board from "../automations/Board";
import Job from "../automations/Job";
import * as jobPost from "../automations/JobPost";
import { PostInfo } from "../common/types";

describe("Job tests", () => {
    let spinner: any;

    beforeEach(() => {
        spinner = {
            start: jest.fn(),
            succeed: jest.fn(),
            stop: jest.fn(),
            text: jest.fn(),
        } as any;
    });

    describe("clones job posts", () => {
        it("successfully clones job posts", async () => {
            jest.spyOn(board, "default").mockImplementation((): any => {
                return {
                    getBoards: jest
                        .fn()
                        .mockReturnValueOnce([{ name: "Canonical - Jobs" }]),
                };
            });
            jest.spyOn(jobPost, "default").mockImplementation((): any => {
                return {
                    duplicate: jest.fn(),
                };
            });
            const page = jest.fn() as any;
            const postInfo = {
                id: 1,
                name: "test",
                location: "test-location",
                boardInfo: {
                    id: 1,
                    name: "Canonical",
                },
                job: {
                    id: 1,
                    name: "test",
                    posts: [{}],
                },
                isLive: true,
            } as PostInfo;

            const job = new Job(page, spinner);

            await job.clonePost([postInfo], ["apac"], 0);

            expect(spinner.start).toHaveBeenCalledWith(
                "Starting to create job posts."
            );
            expect(spinner.text).toEqual("34 of 34 job posts are created.");
            expect(spinner.stop).toHaveBeenCalledTimes(1);
        });

        it("errors out if region doesn't exist", async () => {
            jest.spyOn(board, "default").mockImplementation((): any => {
                return {
                    getBoards: jest
                        .fn()
                        .mockReturnValueOnce([{ name: "Canonical - Jobs" }]),
                };
            });
            jest.spyOn(jobPost, "default").mockImplementation((): any => {
                return {
                    duplicate: jest.fn(),
                };
            });
            const page = jest.fn() as any;
            const postInfo = {
                id: 1,
                name: "test",
                location: "test-location",
                boardInfo: {
                    id: 1,
                    name: "Canonical",
                },
                job: {
                    id: 1,
                    name: "test",
                    posts: [{}],
                },
                isLive: true,
            } as PostInfo;

            const job = new Job(page, spinner);

            try {
                await job.clonePost([postInfo], ["test"], 0);
            } catch (error) {
                expect(error).toEqual(
                    TypeError(
                        "regions_1.regions[regionName] is not iterable (cannot read property undefined)"
                    )
                );
            }

            expect(spinner.start).toHaveBeenCalledWith(
                "Starting to create job posts."
            );
        });

        it("errors out with source ID not found", async () => {
            const page = jest.fn() as any;
            const postInfo = {
                id: 1,
                name: "test",
                location: "test-location",
                boardInfo: {
                    id: 1,
                    name: "test",
                },
                job: {
                    id: 1,
                    name: "test",
                    posts: [{}],
                },
                isLive: true,
            } as PostInfo;

            const job = new Job(page, spinner);

            try {
                await job.clonePost([postInfo], ["test"], 1);
            } catch (error) {
                expect(error).toEqual(
                    new Error(
                        "Job post with 1 ID cannot be found in the Canonical Board."
                    )
                );
            }

            expect(spinner.start).toHaveBeenCalledWith(
                "Starting to create job posts."
            );
        });

        it("errors out with no post found to clone", async () => {
            const page = jest.fn() as any;
            const postInfo = {
                id: 1,
                name: "test",
                location: "test-location",
                boardInfo: {
                    id: 1,
                    name: "test",
                },
                job: {
                    id: 1,
                    name: "test",
                    posts: [{}],
                },
                isLive: true,
            } as PostInfo;

            const job = new Job(page, spinner);

            try {
                await job.clonePost([postInfo], ["test"], 0);
            } catch (error) {
                expect(error).toEqual(new Error("No post found to clone"));
            }

            expect(spinner.start).toHaveBeenCalledWith(
                "Starting to create job posts."
            );
        });

        it("errors out with job board not found", async () => {
            jest.spyOn(board, "default").mockImplementation((): any => {
                return {
                    getBoards: jest
                        .fn()
                        .mockReturnValueOnce([{ name: "test" }]),
                };
            });
            const page = jest.fn() as any;
            const postInfo = {
                id: 1,
                name: "test",
                location: "test-location",
                boardInfo: {
                    id: 1,
                    name: "Canonical",
                },
                job: {
                    id: 1,
                    name: "test",
                    posts: [{}],
                },
                isLive: true,
            } as PostInfo;

            const job = new Job(page, spinner);

            try {
                await job.clonePost([postInfo], ["test"], 0);
            } catch (error) {
                expect(error).toEqual(
                    new Error("Cannot found Canonical - Jobs board")
                );
            }

            expect(spinner.start).toHaveBeenCalledWith(
                "Starting to create job posts."
            );
        });
    });
});
