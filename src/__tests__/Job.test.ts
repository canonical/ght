import * as board from "../automations/Board";
import * as constants from "../common/constants";
import Job from "../automations/Job";
import * as jobPost from "../automations/JobPost";
import { PostInfo } from "../common/types";
import { america } from "colors";

jest.mock("../common/pageUtils", () => ({
    ...jest.requireActual("../common/pageUtils"),
    getIDFromURL: jest.fn().mockReturnValue(1),
}));

Object.defineProperty(constants, "MAIN_URL", {
    writable: true,
    value: "https://test.test",
});

describe("Job tests", () => {
    let spinner: any;
    let page = { reload: jest.fn(), goto: jest.fn() } as any;

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
            expect(spinner.text).toEqual("200 of 200 job posts are created.");
            expect(spinner.stop).toHaveBeenCalledTimes(1);
        });

        it("successfully clones canadian job posts", async () => {
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

            await job.clonePost([postInfo], ["canada"], 0);

            expect(spinner.start).toHaveBeenCalledWith(
                "Starting to create job posts."
            );
            expect(spinner.text).toEqual("20 of 20 job posts are created.");
            expect(spinner.stop).toHaveBeenCalledTimes(1);
        });

        it("successfully clones latin america job posts", async () => {
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

            await job.clonePost([postInfo], ["latam"], 0);

            expect(spinner.start).toHaveBeenCalledWith(
                "Starting to create job posts."
            );
            expect(spinner.text).toEqual("19 of 19 job posts are created.");
            expect(spinner.stop).toHaveBeenCalledTimes(1);
        });

        it("successfully clones americas job posts", async () => {
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

            await job.clonePost([postInfo], ["latam"], 0);

            expect(spinner.start).toHaveBeenCalledWith(
                "Starting to create job posts."
            );
            expect(spinner.text).toEqual("19 of 19 job posts are created.");
            expect(spinner.stop).toHaveBeenCalledTimes(1);
        });

        it("dedups cities before cloning job posts", async () => {
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

            await job.clonePost([postInfo], ["latam", "canada", "americas"], 0);

            expect(spinner.start).toHaveBeenCalledWith(
                "Starting to create job posts."
            );
            expect(spinner.text).toEqual("91 of 91 job posts are created.");
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

    it("gets all jobs", async () => {
        const mockGetJobsFromPage = jest
            .fn()
            .mockReturnValue({ jobs: { "test-job": 1 }, hasMorePage: false });
        Job.prototype["getJobsFromPage"] = mockGetJobsFromPage;

        const job = new Job(page, spinner);
        const getJobs = await job.getJobs();

        expect(getJobs).toEqual(new Map(Object.entries({ "test-job": 1 })));
    });

    describe("gets job ID from post", () => {
        it("successfully gets job ID from post", async () => {
            page = { ...page, $: jest.fn().mockReturnValue(true) };
            const job = new Job(page, spinner);
            const getJobIDFromPost = await job.getJobIDFromPost(1);

            expect(getJobIDFromPost).toBe(1);
        });

        it("fails to get job ID from post", async () => {
            page = { ...page, $: jest.fn() };
            const job = new Job(page, spinner);

            try {
                await job.getJobIDFromPost(1);
            } catch (error) {
                expect(error).toEqual(
                    new Error(
                        "Job cannot be found in https://test.test/jobapps/1/edit."
                    )
                );
            }
        });
    });
});
