declare type Target = {
    commitSHA: string;
    mainAppName: string;
    mainAppUrl: string;
    hasuraAppName: string;
    team: string;
    pipelineName: string;
    pipelineStage: string;
    createAppIfNotExists: boolean;
    hasPullRequest: boolean;
};
declare const getDeploymentTargets: () => Promise<Target[]>;
export { Target, getDeploymentTargets };
