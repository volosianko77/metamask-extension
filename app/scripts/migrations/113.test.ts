import { migrate, version as newVersion } from './113';
import { version } from './113';

const sentryCaptureExceptionMock = jest.fn();

global.sentry = {
  captureException: sentryCaptureExceptionMock,
};

describe('migration #113', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should add new isFirstVisit as false under dapp permission', async () => {
    const oldStorage = {
      meta: {
        version: 112,
      },
      data: {
        PermissionController: {
          subjects: {
            'pancakeswap.finance': {
              origin: 'https://pancakeswap.finance',
              permissions: {
                eth_accounts: {
                  caveats: [
                    {
                      type: 'restrictReturnedAccounts',
                      value: ['pancakevalue'],
                    },
                  ],
                  date: 1709824222665,
                  id: 'id',
                  invoker: 'https://pancakeswap.finance',
                  parentCapability: 'eth_accounts',
                },
              },
            },
            'chainlist.org': {
              origin: 'https://chainlist.org',
              permissions: {
                eth_accounts: {
                  caveats: [
                    {
                      type: 'restrictReturnedAccounts',
                      value: ['chainlistvalue'],
                    },
                  ],
                  date: 1709175588114,
                  id: 'chainlistid',
                  invoker: 'https://chainlist.org',
                  parentCapability: 'eth_accounts',
                },
              },
            },
          },
        },
      },
    };

    const newStorage = await migrate(oldStorage);

    expect(newStorage).toStrictEqual({
      meta: { version: newVersion },
      data: {
        PermissionController: {
          subjects: {
            'pancakeswap.finance': {
              origin: 'https://pancakeswap.finance',
              permissions: {
                eth_accounts: {
                  caveats: [
                    {
                      type: 'restrictReturnedAccounts',
                      value: ['pancakevalue'],
                    },
                  ],
                  date: 1709824222665,
                  id: 'id',
                  invoker: 'https://pancakeswap.finance',
                  parentCapability: 'eth_accounts',
                  isFirstVisit: false,
                },
              },
            },
            'chainlist.org': {
              origin: 'https://chainlist.org',
              permissions: {
                eth_accounts: {
                  caveats: [
                    {
                      type: 'restrictReturnedAccounts',
                      value: ['chainlistvalue'],
                    },
                  ],
                  date: 1709175588114,
                  id: 'chainlistid',
                  invoker: 'https://chainlist.org',
                  parentCapability: 'eth_accounts',
                  isFirstVisit: false,
                },
              },
            },
          },
        },
      },
    });
  });

  it('should not modify state and capture an exception if state.PermissionController is undefined', async () => {
    const oldStorage = {
      meta: {
        version,
      },
      data: {
        testProperty: 'testValue',
      },
    };

    const newStorage = await migrate(oldStorage);

    const expectedNewStorage = {
      meta: {
        version,
      },
      data: {
        testProperty: 'testValue',
      },
    };
    expect(newStorage).toStrictEqual(expectedNewStorage);

    expect(sentryCaptureExceptionMock).toHaveBeenCalledTimes(1);
    expect(sentryCaptureExceptionMock).toHaveBeenCalledWith(
      new Error(`typeof state.PermissionController is undefined`),
    );
  });

  it('should not modify state and capture an exception if state.PermissionController is not an object', async () => {
    const oldStorage = {
      meta: {
        version,
      },
      data: {
        PermissionController: false,
        testProperty: 'testValue',
      },
    };

    const newStorage = await migrate(oldStorage);

    const expectedNewStorage = {
      meta: {
        version,
      },
      data: {
        PermissionController: false,
        testProperty: 'testValue',
      },
    };
    expect(newStorage).toStrictEqual(expectedNewStorage);

    expect(sentryCaptureExceptionMock).toHaveBeenCalledTimes(1);
    expect(sentryCaptureExceptionMock).toHaveBeenCalledWith(
      new Error(`typeof state.PermissionController is boolean`),
    );
  });

  it('should not modify state if state.PermissionController.subjects is undefined', async () => {
    const oldStorage = {
      meta: {
        version,
      },
      data: {
        PermissionController: {
          testPermissionControllerProperty: 'testPermissionControllerValue',
          subjects: undefined,
        },
        testProperty: 'testValue',
      },
    };

    const newStorage = await migrate(oldStorage);

    const expectedNewStorage = {
      meta: {
        version,
      },
      data: {
        PermissionController: {
          testPermissionControllerProperty: 'testPermissionControllerValue',
          subjects: undefined,
        },
        testProperty: 'testValue',
      },
    };
    expect(newStorage).toStrictEqual(expectedNewStorage);
  });

  it('should not modify state if state.PermissionController.subjects is an empty object', async () => {
    const oldStorage = {
      meta: {
        version,
      },
      data: {
        PermissionController: {
          testPermissionControllerProperty: 'testPermissionControllerValue',
          subjects: {},
        },
        testProperty: 'testValue',
      },
    };

    const newStorage = await migrate(oldStorage);

    const expectedNewStorage = {
      meta: {
        version,
      },
      data: {
        PermissionController: {
          testPermissionControllerProperty: 'testPermissionControllerValue',
          subjects: {},
        },
        testProperty: 'testValue',
      },
    };
    expect(newStorage).toStrictEqual(expectedNewStorage);
  });

  it('should not modify state if state.PermissionController.subjects has no permissions', async () => {
    const oldStorage = {
      meta: {
        version,
      },
      data: {
        PermissionController: {
          testPermissionControllerProperty: 'testPermissionControllerValue',
          subjects: {
            testSubjectKey: 'testSubjectKey',
          },
        },
        testProperty: 'testValue',
      },
    };

    const newStorage = await migrate(oldStorage);

    const expectedNewStorage = {
      meta: {
        version,
      },
      data: {
        PermissionController: {
          testPermissionControllerProperty: 'testPermissionControllerValue',
          subjects: {
            testSubjectKey: 'testSubjectKey',
          },
        },
        testProperty: 'testValue',
      },
    };
    expect(newStorage).toStrictEqual(expectedNewStorage);
  });

  it('should not modify state if the permissions inside state.PermissionController.subjects has no value inside', async () => {
    const oldStorage = {
      meta: {
        version,
      },
      data: {
        PermissionController: {
          testPermissionControllerProperty: 'testPermissionControllerValue',
          subjects: {
            permissions: undefined,
          },
        },
        testProperty: 'testValue',
      },
    };

    const newStorage = await migrate(oldStorage);

    const expectedNewStorage = {
      meta: {
        version,
      },
      data: {
        PermissionController: {
          testPermissionControllerProperty: 'testPermissionControllerValue',
          subjects: {
            permissions: undefined,
          },
        },
        testProperty: 'testValue',
      },
    };
    expect(newStorage).toStrictEqual(expectedNewStorage);
  });
});
