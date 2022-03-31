import { USER_ERROR } from "./constants";
import { Ora } from "ora";
import * as Sentry from "@sentry/node";
// @ts-ignore It's necessary for sentry to trace errors. Importing @sentry/tracing patches the global hub for tracing to work.
import * as Tracing from "@sentry/tracing";
import * as puppeteer from 'puppeteer'

export const isDevelopment = () => process.env.NODE_ENV === "development";

export const setupSentry = () => {
    if (!isDevelopment()) {
        Sentry.init({
            dsn: "https://b4ad6d6db883487ebc914236321bf0e0@sentry.is.canonical.com//50",
            release: "ght@" + process.env.npm_package_version,
            attachStacktrace: true,
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

/**
 * puppeteer.page.evaluate wrapper
 * to be able to track the source of the error 
 */
export const evaluate: (
    element: puppeteer.Page | puppeteer.ElementHandle<Element>,
    pageFunction: puppeteer.EvaluateFn<any>,
    ...args: puppeteer.SerializableOrJSHandle[]
) => Promise<any> = async (element, pageFunction, ...args) => {
    try {
        return await (element as any).evaluate(pageFunction, ...args);
    } catch (err) {
        // change the error stack trace, to be able to track the error source
        throw new Error((err as Error).message);
    }
};
