import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { parse } from 'dotenv';
import { setEnvironmentVariables } from '../../build/set-environment-variables';
import { type Args } from './cli';
import { getMetaMaskVersion } from './helpers';

const BUILDS_YML_PATH = join(__dirname, '../../../builds.yml');

/**
 * @params rcFilePath - The path to the rc file.
 * @returns The definitions loaded from the rc file.
 */
function loadEnv(rcFilePath: string): Map<string, unknown> {
  const definitions = new Map<string, unknown>();
  const rc = parse(readFileSync(rcFilePath, 'utf8'));
  Object.entries(rc).forEach(([key, value]) => definitions.set(key, value));
  return definitions;
}

/**
 *
 * @param buildType
 * @returns
 */
export function getVariables({ type, env }: Args, buildTypesConfig: Build) {
  const vars = loadConfigVars(type, buildTypesConfig);
  const version = getMetaMaskVersion();
  setEnvironmentVariables({
    buildType: type,
    version: type === 'main' ? `${version}` : `${version}-${type}.0`,
    environment: env,
    variables: {
      set(key: string | Record<string, unknown>, value?: unknown): void {
        if (typeof key === 'object') {
          Object.entries(key).forEach(([k, v]) => vars.set(k, v));
        } else {
          vars.set(key, value!);
        }
      },
      isDefined(key: string): boolean {
        return vars.has(key);
      },
      get(key: string): unknown {
        return vars.get(key);
      },
      getMaybe(key: string): unknown {
        return vars.get(key);
      },
    },
    isDevBuild: env === 'development',
    isTestBuild: false,
    buildName: 'MetaMask',
  });
  return vars;
}

export type Build = {
  buildTypes: Record<
    string,
    {
      features?: string[];
      env?: (string | { [k: string]: unknown })[];
    }
  >;
  env: (string | Record<string, unknown>)[];
  features: Record<
    string,
    null | { env?: (string | { [k: string]: unknown })[] }
  >;
};

/**
 *
 */
export function getBuildTypes(): Build {
  return parseYaml(readFileSync(BUILDS_YML_PATH, 'utf8'));
}

/**
 *
 * @param type
 * @param build
 * @returns
 */
function loadConfigVars(type: string, { env, buildTypes, features }: Build) {
  const activeBuild = buildTypes[type];

  const definitions = loadEnv(join(__dirname, '../../../.metamaskrc'));
  addVars(activeBuild.env);
  activeBuild.features?.forEach((feature) => addVars(features[feature]?.env));
  addVars(env);

  function addVars(pairs?: (string | { [k: string]: unknown })[]): void {
    pairs?.forEach((pair) => {
      if (typeof pair === 'string') return;
      Object.entries(pair).forEach(([key, value]) => {
        if (!definitions.has(key)) {
          definitions.set(key, value);
        }
      });
    });
  }

  return definitions;
}
