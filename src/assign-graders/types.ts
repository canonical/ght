export type Config = {
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

export type Application = {
    candidate: string;
    applicationID: string;
    toGrade: boolean;
};

export type Job = {
    id: number;
    jobName: string;
};
