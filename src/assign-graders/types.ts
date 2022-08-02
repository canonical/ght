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
    job: string;
};

export type Application = {
    candidate: string;
    job: string;
    applicationID: string;
    toGrade: boolean;
};
