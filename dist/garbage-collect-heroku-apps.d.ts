declare type GarbageCollectHerokuAppsOptions = {
    githubAPIKey: string;
};
declare const garbageCollectHerokuApps: (options: GarbageCollectHerokuAppsOptions) => Promise<void>;
export { garbageCollectHerokuApps };
