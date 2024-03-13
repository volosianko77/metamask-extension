import { cloneDeep, isArray } from 'lodash';
import { hasProperty, isObject } from '@metamask/utils';

export const version = 113;

/**
 * Prior to this migration, snap <> dapp permissions were wildcards i.e. `wallet_snap_*`.
 * Now the permission has been changed to `wallet_snap` and the current snap permissions
 * that are under wildcards will be added as caveats to a parent `wallet_snap` permission.
 *
 * @param originalVersionedData - Versioned MetaMask extension state, exactly what we persist to dist.
 * @param originalVersionedData.meta - State metadata.
 * @param originalVersionedData.meta.version - The current state version.
 * @param originalVersionedData.data - The persisted MetaMask state, keyed by controller.
 * @returns Updated versioned MetaMask extension state.
 */
export async function migrate(originalVersionedData: {
  meta: { version: number };
  data: Record<string, unknown>;
}) {
  const versionedData = cloneDeep(originalVersionedData);
  versionedData.meta.version = version;
  const state = versionedData.data;
  const newState = transformState(state);
  versionedData.data = newState;
  return versionedData;
}

// We return state AS IS if there is any corruption
function transformState(state: Record<string, unknown>) {
  if (!isObject(state.PermissionController)) {
    global.sentry?.captureException?.(
      new Error(
        `typeof state.PermissionController is ${typeof state.PermissionController}`,
      ),
    );
    return state;
  }

  const { PermissionController } = state;

  if (!isObject(PermissionController.subjects)) {
    global.sentry?.captureException?.(
      new Error(
        `typeof PermissionController.subjects is ${typeof PermissionController.subjects}`,
      ),
    );
    return state;
  }
  const { subjects } = PermissionController;

  // no dapp is connected for current account, no need to throw exception
  if (!isObject(subjects)) {
    return state;
  }

  for (const [_, subject] of Object.entries(subjects)) {
    if (!isObject(subject) || !isObject(subject.permissions)) {
      return state;
    }
    // We iterate all the permissions for connected dapps
    // And add isFirstVisit as true by default
    const { permissions } = subject;
    // New permissions object that we use to tack on the `wallet_snap` permission
    const updatedPermissions = { ...permissions };
    for (const [permissionName, permission] of Object.entries(permissions)) {
      // check if the permission is namespaced
      if (!isObject(permission)) {
        return state;
      }
      const updatedPermission = { ...permission };
      updatedPermission.isFirstVisit = false;
      updatedPermissions[permissionName] = updatedPermission;
    }
    subject.permissions = updatedPermissions;
  }

  return state;
}
