import { USER_ERROR } from "./constants";
import { Ora } from "ora";
import * as Sentry from "@sentry/node";
// @ts-ignore It's necessary for sentry to trace errors. Importing @sentry/tracing patches the global hub for tracing to work.
import * as Tracing from "@sentry/tracing";

export const isDevelopment = () => process.env.NODE_ENV === "development";

export const setupSentry = () => {
    if (isDevelopment()) {
        Sentry.init({
            dsn: "https://b4ad6d6db883487ebc914236321bf0e0@sentry.is.canonical.com//50",
        });
    }
} 

export const displayError = (error: Error, spinner: Ora) => {
    if(!isDevelopment() && error.name !== USER_ERROR)  Sentry.captureException(error);
    const errorMessage = error.message;
    errorMessage
        ? spinner.fail(`${errorMessage}`)
        : spinner.fail("An error occurred.");
}

export const reportError = (error: string) => {
    if(!isDevelopment())  Sentry.captureException(error);
}
