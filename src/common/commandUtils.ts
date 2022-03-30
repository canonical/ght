import UserError from "./UserError";
// @ts-ignore This can be deleted after https://github.com/enquirer/enquirer/issues/135 is fixed.
import { Select, MultiSelect, Toggle } from "enquirer";

export const runPrompt = async (prompt: Select | MultiSelect | Toggle) => {
    try {
        return await prompt.run();
    } catch {
        throw new UserError("Interrupted.");
    }
};
