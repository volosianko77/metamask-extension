import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { parse } from './ini';

const BUILDS_YML_PATH = join(__dirname, '../../../builds.yml');

/**
 *
 *
 * @param filePath
 * @param env
 * @returns
 */
function loadIni(
  filePath: string,
  { definitions }: Omit<BuildConfig, 'activeFeatures'>,
) {
  for (const { key, value } of parse(readFileSync(filePath))) {
    definitions.set(key.toString('utf8'), value);
  }
  return { definitions };
}

/**
 *
 * @param buildType
 * @returns
 */
export function loadEnv(buildType: string, buildTypesConfig: BuildYaml) {
  return loadIni(
    join(__dirname, '../../../.metamaskrc'),
    loadFeaturesAndDefinitions(buildType, buildTypesConfig),
  );
}

export type BuildYaml = {
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
export const loadBuildTypesConfig = function loadBuildTypesConfig(): BuildYaml {
  const data = readFileSync(BUILDS_YML_PATH, 'utf8');
  return parseYaml(data);
};

export type BuildConfig = {
  definitions: Map<string, unknown>;
  activeFeatures?: string[];
};

/**
 *
 * @param buildType
 * @param buildTypesConfig
 * @returns
 */
export function loadFeaturesAndDefinitions(
  buildType: string,
  { buildTypes, env, features }: BuildYaml,
): BuildConfig {
  const activeBuild = buildTypes[buildType];
  const activeFeatures = activeBuild.features;

  const definitions = new Map<string, any>();

  // 1. build type env
  activeBuild.env?.forEach((pair) => {
    if (typeof pair === 'string') return;
    Object.entries(pair).forEach(([key, value]) => definitions.set(key, value));
  });

  // 2. features env
  activeFeatures?.forEach((feature) => {
    features[feature]?.env?.forEach((pair) => {
      if (typeof pair === 'string') return;
      Object.entries(pair).forEach(
        ([key, value]) => !definitions.has(key) && definitions.set(key, value),
      );
    });
  });

  // 3. root env
  env.forEach((pair) => {
    if (typeof pair === 'object') {
      Object.entries(pair).forEach(([key, value]) => {
        !definitions.has(key) && definitions.set(key, value);
      });
    }
  });

  return { activeFeatures, definitions };
}
