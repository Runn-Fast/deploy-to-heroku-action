"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const heroku = __importStar(require("./heroku"));
const utils_1 = require("./utils");
const { GITHUB_EVENT_NAME, GITHUB_EVENT_PATH, GITHUB_REF } = process.env;
console.log({ GITHUB_EVENT_NAME, GITHUB_EVENT_PATH, GITHUB_REF });
const getDeploymentTargets = () => {
    switch (GITHUB_EVENT_NAME) {
        case 'pull_request':
            const pullRequestId = '';
            if (utils_1.isEmptyString(pullRequestId)) {
                throw new Error('Could not find the Github Pull Request ID.');
            }
            return [
                {
                    mainAppName: `runn-review-pr-${pullRequestId}`,
                    hasuraAppName: `runn-hasura-pr-${pullRequestId}`,
                    isProduction: false,
                },
            ];
        case 'branch':
            switch (GITHUB_REF) {
                case 'refs/heads/test':
                    return [
                        {
                            mainAppName: 'runn-app-test',
                            hasuraAppName: 'runn-hasura-test',
                            isProduction: false,
                        },
                    ];
                case 'refs/heads/development':
                    return [
                        {
                            mainAppName: 'runn-app-staging',
                            hasuraAppName: 'runn-hasura-staging',
                            isProduction: false,
                        },
                    ];
                case 'refs/heads/production':
                    return [
                        {
                            mainAppName: 'runn-app-production',
                            hasuraAppName: 'runn-hasura-production',
                            isProduction: true,
                        },
                    ];
                default:
                    throw new Error(`Unknown github.ref: "${GITHUB_REF}"`);
            }
        default:
            throw new Error(`Unhandled github.event_name: "${GITHUB_EVENT_NAME}"`);
    }
};
const createAppEnvironment = async (target) => {
    const { mainAppName } = target;
    const mainAppExists = await heroku.doesAppExist({ appName: mainAppName });
    if (!mainAppExists) {
        await heroku.createApp({
            appName: mainAppName,
            team: 'runn',
            pipelineName: 'runn-app',
            pipelineStage: 'development',
        });
        await heroku.createAddon({
            appName: mainAppName,
            addonName: 'rediscloud:30',
        });
        await heroku.createAddon({
            appName: mainAppName,
            addonName: 'heroku-postgresql:hobby-dev',
            version: '12',
            wait: true,
        });
        const databaseUrl = heroku.getEnvVar({
            appName: mainAppName,
            varName: 'DATABASE_URL',
        });
        console.log({ databaseUrl });
    }
};
const main = async () => {
    const targets = await getDeploymentTargets();
    for (const target of targets) {
        await createAppEnvironment(target);
    }
};
main().catch((error) => {
    core.setFailed(error instanceof Error ? error.message : String(error));
});
//# sourceMappingURL=index.js.map