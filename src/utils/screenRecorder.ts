import { ScreenRecorderOptions } from "../core/types";
import { PuppeteerScreenRecorder } from "puppeteer-screen-recorder";
import { Page } from "puppeteer";
import os from "os";
import { join } from "path";
import { createWriteStream, existsSync, mkdirSync, WriteStream } from "fs";

export class ScreenRecorder {
    private recorder: PuppeteerScreenRecorder | null = null;
    private isRecording = false;
    private outputStream: WriteStream | null = null;
    private options: ScreenRecorderOptions = {
        followNewTab: true,
        fps: 25,
        ffmpeg_Path: process.env.SNAP
            ? `${process.env.SNAP}/usr/bin/ffmpeg`
            : null,
        aspectRatio: "4:3",
    };

    constructor(private page: Page) {}

    async start(): Promise<void> {
        if (this.isRecording) {
            throw new Error("Recording is already in progress");
        }

        // define output directory for recording file
        const homeDir = process.env.SNAP_USER_COMMON || join(os.homedir(), ".ght");
        const directory = join(homeDir, "recordings");
        if (!existsSync(directory)) {
            mkdirSync(directory, { recursive: true });
        }

        // define recording filename
        const filename = `ght_recording_${new Date()
            .toISOString()
            .replace(/[:.]/g, "-")}.mp4`;
        const outputPath = join(directory, filename);

        // start streaming recording
        this.recorder = new PuppeteerScreenRecorder(this.page, this.options);
        this.outputStream = createWriteStream(outputPath);
        await this.recorder.startStream(this.outputStream);
        this.isRecording = true;
    }

    async stop(): Promise<void> {
        if (!this.isRecording || !this.recorder) {
            throw new Error("No active recording to stop");
        }

        await this.recorder.stop();
        this.outputStream.close();
        this.isRecording = false;
        this.recorder = null;
    }

    isActive(): boolean {
        return this.isRecording;
    }
}
