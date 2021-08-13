declare type SetCommitEnvVarOptions = {
    appName: string;
    commitSHA: string;
};
declare const setCommitEnvVar: (options: SetCommitEnvVarOptions) => Promise<void>;
export { setCommitEnvVar };
