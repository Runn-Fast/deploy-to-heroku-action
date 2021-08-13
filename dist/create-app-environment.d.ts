import { Target } from './targets';
import { EnvVars } from './env-vars';
declare type CreateMainAppOptions = {
    target: Target;
    envVars: EnvVars;
};
declare const createMainApp: (options: CreateMainAppOptions) => Promise<boolean>;
declare type CreateHasuraAppOptions = {
    target: Target;
    envVars: EnvVars;
};
declare const createHasuraApp: (options: CreateHasuraAppOptions) => Promise<boolean>;
export { createMainApp, createHasuraApp };
