import { EnvVars } from './env-vars';
declare type LoginOptions = {
    email: string;
    apiKey: string;
};
declare const login: (options: LoginOptions) => Promise<void>;
declare type GetAppListOptions = {
    team: string;
};
declare type GetAppListResult = Array<{
    name: string;
}>;
declare const getAppList: (options: GetAppListOptions) => Promise<GetAppListResult>;
declare type DoesAppExistOptions = {
    appName: string;
};
declare const doesAppExist: (options: DoesAppExistOptions) => Promise<boolean>;
declare type CreateAppOptions = {
    appName: string;
    team: string;
    pipelineName: string;
    pipelineStage: string;
};
declare const createApp: (options: CreateAppOptions) => Promise<void>;
declare type DestroyAppOptions = {
    appName: string;
};
declare const destroyApp: (options: DestroyAppOptions) => Promise<void>;
declare type CreateAddonOptions = {
    appName: string;
    addonName: string;
    version?: string;
    wait?: boolean;
};
declare const createAddon: (options: CreateAddonOptions) => Promise<void>;
declare type GetEnvVarOptions = {
    appName: string;
    varName: string;
};
declare const getEnvVar: (options: GetEnvVarOptions) => Promise<string>;
declare type GetAllEnvVarsOptions = {
    appName: string;
};
declare const getAllEnvVars: (options: GetAllEnvVarsOptions) => Promise<EnvVars>;
declare type SetEnvVarOptions = {
    appName: string;
    config: Record<string, string>;
};
declare const setEnvVars: (options: SetEnvVarOptions) => Promise<void>;
declare type UnsetEnvVarOptions = {
    appName: string;
    varNames: string[];
};
declare const unsetEnvVars: (options: UnsetEnvVarOptions) => Promise<void>;
declare type ReleaseContainerOptions = {
    appName: string;
    dynoTypes: string[];
};
declare const releaseContainer: (options: ReleaseContainerOptions) => Promise<void>;
declare type ScaleDynosToOneOptions = {
    appName: string;
    dynoTypes: string[];
};
declare const scaleDynosToOne: (options: ScaleDynosToOneOptions) => Promise<void>;
declare type RunOptions = {
    appName: string;
    type: string;
    command: string[];
};
declare const run: (options: RunOptions) => Promise<string>;
declare type GetDynoList = {
    appName: string;
};
declare type DynoStatus = {
    attach_url: string | null;
    command: string;
    created_at: string;
    id: string;
    name: string;
    app: {
        id: string;
        name: string;
    };
    release: {
        id: string;
        version: number;
    };
    size: string;
    state: 'up';
    type: 'web' | 'worker';
    updated_at: string;
};
declare const getDynoList: (options: GetDynoList) => Promise<DynoStatus[]>;
declare type RestartDynoOptions = {
    appName: string;
    dynoType: string;
};
declare const restartDyno: (options: RestartDynoOptions) => Promise<void>;
declare type BootDynosOptions = {
    appName: string;
    dynoTypes: string[];
    restartIfAlreadyRunning?: boolean;
};
declare const bootDynos: (options: BootDynosOptions) => Promise<void>;
export { login, getAppList, doesAppExist, createApp, destroyApp, createAddon, getEnvVar, getAllEnvVars, setEnvVars, unsetEnvVars, releaseContainer, run, getDynoList, scaleDynosToOne, restartDyno, bootDynos, };
