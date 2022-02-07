export interface BaseInfo {
    id: number;
    name: string;
}

export interface Post extends BaseInfo {
    location: string;
    boardInfo: BaseInfo;
    job: Job;
    isLive: boolean;
}

export interface Job extends BaseInfo {
    posts: Post[];
}
