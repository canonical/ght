import { USER_ERROR } from "./constants"

export default class UserError extends Error {
    constructor (message: string) {
        super(message)
        this.name = USER_ERROR
    }
}
