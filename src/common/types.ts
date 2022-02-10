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
