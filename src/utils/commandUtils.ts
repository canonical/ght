import { UserError } from "./processUtils";
// @ts-ignore This can be deleted after https://github.com/enquirer/enquirer/issues/135 is fixed.
import { Select, MultiSelect, Toggle } from "enquirer";

export const runPrompt = async (prompt: Select | MultiSelect | Toggle) => {
    try {
        return await prompt.run();
    } catch {
        throw new UserError("Interrupted.");
    }
};

export function validateNumberParam(param: string, fieldName: string) {
    const intValue = parseInt(param);
    if (isNaN(intValue)) throw new UserError(`${fieldName} must be a number`);
    return intValue;
}
