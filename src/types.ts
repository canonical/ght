export interface BaseInfo {
    id: number;
    name: string;
}

export interface JobPost extends BaseInfo {
    location: string;
    boardInfo: BaseInfo;
}

export interface Job extends BaseInfo {
    posts: JobPost[];
}