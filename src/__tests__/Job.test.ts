import * as board from "../automations/Board";
import * as constants from "../common/constants";
import Job from "../automations/Job";
import * as jobPost from "../automations/JobPost";
import { PostInfo } from "../common/types";

describe("Job tests", () => {
    let spinner: any;
    const page = { reload: jest.fn() } as any;

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

            await job.clonePost([postInfo], ["americas", "apac", "emea"], 0);

            expect(spinner.start).toHaveBeenCalledWith(
                "Starting to create job posts."
            );
            expect(spinner.text).toEqual("178 of 178 job posts are created.");
            expect(spinner.stop).toHaveBeenCalledTimes(1);
        });

        it("fails if region doesn't exist", async () => {
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
                await job.clonePost([postInfo], ["test-region"], 0);
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

        it("fails if region is misspelled/given uppercase character", async () => {
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
                await job.clonePost([postInfo], ["Americas"], 0);
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

        it("fails with source ID not found", async () => {
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

        it("fails with no post found to clone", async () => {
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

        it("fails with job board not found", async () => {
            jest.spyOn(board, "default").mockImplementation((): any => {
                return {
                    getBoards: jest
                        .fn()
                        .mockReturnValueOnce([{ name: "test" }]),
                };
            });

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

    describe("delete job posts", () => {
        let postInfo = {
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

        let jobData = { id: 1, name: "test", posts: [postInfo] };

        beforeEach(() => {
            Object.defineProperty(constants, "MAIN_URL", {
                writable: true,
                value: "https://test.test",
            });
        });

        it("successfully deletes job posts", async () => {
            jest.spyOn(jobPost, "default").mockImplementation((): any => {
                return {
                    setStatus: jest.fn(),
                    deletePost: jest.fn(),
                };
            });

            postInfo = { ...postInfo, location: "emea" };
            jobData = { id: 1, name: "test", posts: [postInfo] };
            const job = new Job(page, spinner);

            await job.deletePosts(jobData);

            expect(spinner.text).toEqual("1 of 1 job posts were deleted.");
            expect(spinner.succeed).toHaveBeenCalledTimes(1);
        });

        it("fails if region doesn't exist", async () => {
            const job = new Job(page, spinner);

            try {
                await job.deletePosts(jobData, ["test-region"], 1);
            } catch (error) {
                expect(error).toEqual(
                    TypeError(
                        "Cannot read properties of undefined (reading 'filter')"
                    )
                );
            }
        });

        it("fails if region is misspelled/given uppercase character", async () => {
            const job = new Job(page, spinner);

            try {
                await job.deletePosts(jobData, ["Apac"], 1);
            } catch (error) {
                expect(error).toEqual(
                    TypeError(
                        "Cannot read properties of undefined (reading 'filter')"
                    )
                );
            }
        });
    });
});
