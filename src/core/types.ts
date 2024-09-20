export interface BaseInfo {
    id: number;
    name: string;
}

export interface PostInfo extends BaseInfo {
    location: string;
    boardInfo: BaseInfo;
    job: JobInfo;
    isLive: boolean;
}

export interface JobInfo extends BaseInfo {
    posts: PostInfo[];
}

export type JobBoard = {
    id: number;
    name: string;
    publishStatusId: number;
    unpublishStatusId: number;
};

// Assign graders

export type GradersConfig = {
    [job: string]: {
        [stage: string]: [
            {
                name: string;
                active: boolean;
            },
        ];
    };
};

export type Grader = {
    name: string;
    jobName: string;
};

export type GraderRecord = {
    Grader: string;
    Assignments: number;
};

export type Application = {
    candidate: string;
    applicationID: string;
};

export type JobToAssign = {
    id: number;
    jobName: string;
};

export type ScreenRecorderOptions = {
    aspectRatio?: "3:2" | "4:3" | "16:9";
    autopad?: {
        color?: string;
    };
    ffmpeg_Path?: string | null;
    followNewTab?: boolean;
    format?: "jpeg" | "png";
    fps?: number;
    quality?: number;
    recordDurationLimit?: number;
    videoBitrate?: number;
    videoCodec?: string;
    videoCrf?: number;
    videoFrame?: {
        height?: number | null;
        width?: number | null;
    };
    videoPixelFormat?: string;
    videoPreset?: string;
};
