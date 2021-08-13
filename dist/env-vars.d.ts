declare type EnvVars = Record<string, string>;
declare const parseEnvVars: (input: string) => EnvVars;
export { EnvVars, parseEnvVars };
