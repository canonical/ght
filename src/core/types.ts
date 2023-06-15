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
            }
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
    toGrade: boolean;
};

export type JobToAssign = {
    id: number;
    jobName: string;
};
