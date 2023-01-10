import * as index from "..";

jest.mock("puppeteer", () => {
    return {
        Page: jest.fn(),
    };
});

jest.mock("commander", () => {
    return {
        Command: jest.fn().mockImplementation(() => {
            return {
                parseAsync: jest.fn(),
                description: jest.fn(),
                command: jest.fn(),
            };
        }),
    };
});

jest.mock("..", () => {
    return {
        main: jest.fn(),
        addPosts: jest.fn(),
        deletePosts: jest.fn(),
    };
});

describe("calling methods", () => {
    it("calls add posts method", async () => {
        const spinner = {
            start: jest.fn(),
            succeed: jest.fn(),
            stop: jest.fn(),
        } as any;
        const page = jest.fn() as any;
        console.log = jest.fn();

        jest.spyOn(index, "addPosts").mockResolvedValueOnce(
            console.log("addPosts called")
        );

        index.addPosts(spinner, false, 1, ["test"], page);
        expect(console.log).toHaveBeenCalledWith("addPosts called");
    });

    it("calls delete posts method", async () => {
        const spinner = {
            start: jest.fn(),
            succeed: jest.fn(),
            stop: jest.fn(),
        } as any;
        const page = jest.fn() as any;
        console.log = jest.fn();

        jest.spyOn(index, "deletePosts").mockResolvedValueOnce(
            console.log("deletePosts called")
        );

        index.deletePosts(spinner, false, 1, ["test"], page);
        expect(console.log).toHaveBeenCalledWith("deletePosts called");
    });
});
