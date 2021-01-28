"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvVar = exports.createAddon = exports.createApp = exports.doesAppExist = void 0;
const exec_1 = require("@actions/exec");
const doesAppExist = async (options) => {
    return true;
};
exports.doesAppExist = doesAppExist;
const createApp = async (options) => {
    const { appName, team, pipelineName, pipelineStage } = options;
    await exec_1.exec('heroku', [
        'apps:create',
        `"${appName}"`,
        `--team="${team}"`,
        '--no-remote',
        '--stack=container',
    ]);
    await exec_1.exec('heroku', [
        'pipelines:add',
        `"${pipelineName}"`,
        `--stage="${pipelineStage}"`,
        `--app="${appName}"`,
    ]);
};
exports.createApp = createApp;
const createAddon = async (options) => {
    const { appName, addonName, version, wait } = options;
    await exec_1.exec('heroku', [
        `"${addonName}"`,
        `--app="${appName}"`,
        version != null ? `--version="${version}"` : undefined,
        wait === true ? '--wait' : undefined,
    ].filter(Boolean));
};
exports.createAddon = createAddon;
const getEnvVar = async (options) => {
    const { appName, varName } = options;
    let output = '';
    await exec_1.exec('heroku', ['config:get', `"${varName}"`, `--app="${appName}"`], {
        listeners: {
            stdout: (data) => {
                output += data.toString();
            },
        },
    });
    return output;
};
exports.getEnvVar = getEnvVar;
//# sourceMappingURL=heroku.js.map