declare type CreateGithubDeploymentOptions = {
    githubAPIKey: string;
    ref: string;
};
declare const createGithubDeployment: (options: CreateGithubDeploymentOptions) => Promise<number>;
declare enum GithubDeploymentState {
    ERROR = "error",
    FAILURE = "failure",
    INACTIVE = "inactive",
    IN_PROGRESS = "in_progress",
    QUEUED = "queued",
    PENDING = "pending",
    SUCCESS = "success"
}
declare type SetGithubDeploymentStatusOptions = {
    githubAPIKey: string;
    ref: string;
    deploymentId: number;
    state: GithubDeploymentState;
    environmentUrl: string;
};
declare const setGithubDeploymentStatus: (options: SetGithubDeploymentStatusOptions) => Promise<void>;
export { createGithubDeployment, setGithubDeploymentStatus, GithubDeploymentState, };
