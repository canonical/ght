import Job from "../core/Job";
import * as jobPost from "../core/JobPost";
import { JobBoard, PostInfo } from "../core/types";
import Config from "../config/Config";
import JobPost from "../core/JobPost";

jest.mock("../utils/pageUtils", () => ({
    ...jest.requireActual("../utils/pageUtils"),
    getIDFromURL: jest.fn().mockReturnValue(1),
}));

const config = new Config();

describe("Job tests", () => {
    let spinner: any;
    let page = { reload: jest.fn(), goto: jest.fn() } as any;

    beforeEach(() => {
        spinner = {
            start: jest.fn(),
            succeed: jest.fn(),
            stop: jest.fn(),
            text: jest.fn(),
            info: jest.fn(),
        } as any;
    });

    describe("clones job posts", () => {
        it("successfully clones job posts", async () => {
            jest.spyOn(Job.prototype, "getBoardToPost").mockImplementation(
                (): any => {
                    return [{ name: "Canonical - Jobs" }];
                },
            );
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

            const job = new Job(page, spinner, config);

            await job.clonePost(
                [postInfo],
                ["americas", "apac", "emea"],
                0,
                {} as JobBoard,
            );

            expect(spinner.start).toHaveBeenCalledWith(
                "Starting to create job posts.",
            );
            expect(spinner.text).toEqual("218 of 218 job posts are created.");
            expect(spinner.stop).toHaveBeenCalledTimes(1);
        });

        it("fails if region doesn't exist", async () => {
            jest.spyOn(Job.prototype, "getBoardToPost").mockImplementation(
                (): any => {
                    return [{ name: "Canonical - Jobs" }];
                },
            );
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

            const job = new Job(page, spinner, config);

            await expect(
                job.clonePost([postInfo], ["test"], 0, {} as JobBoard),
            ).rejects.toThrow();

            expect(spinner.start).toHaveBeenCalledWith(
                "Starting to create job posts.",
            );
        });

        it("fails if region is misspelled/given uppercase character", async () => {
            jest.spyOn(Job.prototype, "getBoardToPost").mockImplementation(
                (): any => {
                    return [{ name: "Canonical - Jobs" }];
                },
            );
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

            const job = new Job(page, spinner, config);

            await expect(
                job.clonePost([postInfo], ["LATAM"], 0, {} as JobBoard),
            ).rejects.toThrow(/is not iterable/i);

            expect(spinner.start).toHaveBeenCalledWith(
                "Starting to create job posts.",
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

            const job = new Job(page, spinner, config);

            try {
                await job.clonePost([postInfo], ["test"], 1, {} as JobBoard);
            } catch (error) {
                expect(error).toEqual(
                    new Error(
                        "Job post with 1 ID cannot be found in the Canonical Board.",
                    ),
                );
            }

            expect(spinner.start).toHaveBeenCalledWith(
                "Starting to create job posts.",
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

            const job = new Job(page, spinner, config);

            try {
                await job.clonePost([postInfo], ["test"], 0, {} as JobBoard);
            } catch (error) {
                expect(error).toEqual(new Error("No post found to clone"));
            }

            expect(spinner.start).toHaveBeenCalledWith(
                "Starting to create job posts.",
            );
        });

        it("fails with job board not found", async () => {
            jest.spyOn(Job.prototype, "getBoardToPost").mockImplementation(
                (): any => {
                    return [{ name: "Canonical - Jobs" }];
                },
            );

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

            const job = new Job(page, spinner, config);

            await expect(
                job.clonePost([postInfo], ["test"], 0, {} as JobBoard),
            ).rejects.toThrow();

            expect(spinner.start).toHaveBeenCalledWith(
                "Starting to create job posts.",
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
            const job = new Job(page, spinner, config);

            await job.deletePosts(jobData);

            expect(spinner.text).toEqual("1 of 1 job posts were deleted.");
            expect(spinner.succeed).toHaveBeenCalledTimes(1);
        });

        it("fails if region doesn't exist", async () => {
            const job = new Job(page, spinner, config);

            await expect(
                job.deletePosts(jobData, ["test"], 1),
            ).rejects.toThrow();
        });

        it("fails if region is misspelled/given uppercase character", async () => {
            const job = new Job(page, spinner, config);

            try {
                await job.deletePosts(jobData, ["Apac"], 1);
            } catch (error) {
                expect(error).toEqual(
                    TypeError(
                        "Cannot read properties of undefined (reading 'includes')",
                    ),
                );
            }
        });
    });

    it("gets all jobs", async () => {
        const mockGetJobsFromPage = jest
            .fn()
            .mockReturnValue({ jobs: { "test-job": 1 }, hasMorePage: false });
        Job.prototype["getJobsFromPage"] = mockGetJobsFromPage;

        const job = new Job(page, spinner, config);
        const getJobs = await job.getJobs();

        expect(getJobs).toEqual(new Map(Object.entries({ "test-job": 1 })));
    });

    describe("gets job ID from post", () => {
        it("successfully gets job ID from post", async () => {
            page = { ...page, $: jest.fn().mockReturnValue(true) };
            const job = new Job(page, spinner, config);
            const getJobIDFromPost = await job.getJobIDFromPost(1);

            expect(getJobIDFromPost).toBe(1);
        });

        it("fails to get job ID from post", async () => {
            page = { ...page, $: jest.fn() };
            const job = new Job(page, spinner, config);

            await expect(job.getJobIDFromPost(1)).rejects.toThrow(
                /Job cannot be found/i,
            );
        });
    });

    describe("raw location strings", () => {
        beforeEach(() => {
            jest.clearAllMocks();
            jest.restoreAllMocks();
        });

        it("successfully duplicates post with no city name in location", async () => {
            // test page
            const testPage = {
                $: jest.fn(),
                $eval: jest
                    .fn()
                    .mockResolvedValue("Douglas, IsleMan, Isle of Man"),
            } as any;

            const jobPostInstance = new JobPost(testPage, config);

            // spy on functions we want to verify
            const reduceSpy = jest.spyOn(Array.prototype, "reduce");
            const getCityNameSpy = jest.spyOn(
                jobPostInstance as any,
                "getCityNameFromFreeJobBoards",
            );

            // expect error fetching data key as it will not exist in
            // mocked environment.  this test is for the code before
            // the fetching of this data key.
            await expect(
                jobPostInstance.getLocationInfo("Home based - EMEA"),
            ).rejects.toThrow(
                "Data key to retrieve location information cannot be found.",
            );

            // since no city name, reduce function should not be called,
            // getCityNameFromFreeJobBoards should be called, and eval
            // should be called with a specific selector
            expect(reduceSpy).not.toHaveBeenCalled();
            expect(getCityNameSpy).toHaveBeenCalled();
            expect(testPage.$eval).toHaveBeenCalledWith(
                'input[placeholder="Select location"]',
                expect.any(Function),
            );
        });

        it("successfully duplicates post with city name in location", async () => {
            // test page
            const testPage = {
                $: jest.fn(),
                $eval: jest.fn(),
            } as any;

            const jobPostInstance = new JobPost(testPage, config);

            // spy on functions we want to verify
            const reduceSpy = jest.spyOn(Array.prototype, "reduce");
            const getCityNameSpy = jest.spyOn(
                jobPostInstance as any,
                "getCityNameFromFreeJobBoards",
            );

            // expect error fetching data key as it will not exist in
            // mocked environment.  this test is for the code before
            // the fetching of this data key.
            await expect(
                jobPostInstance.getLocationInfo("Home based - Europe, Zagreb"),
            ).rejects.toThrow(
                "Data key to retrieve location information cannot be found.",
            );

            // since there is a city name, reduce function should be called,
            // and getCityNameFromFreeJobBoards nor eval should be called.
            expect(reduceSpy).toHaveBeenCalled();
            expect(getCityNameSpy).not.toHaveBeenCalled();
            expect(testPage.$eval).not.toHaveBeenCalled();
        });
    });
});
