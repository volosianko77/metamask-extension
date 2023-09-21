import { findCustodianByDisplayName } from './find-by-custodian-name';

describe('findCustodianByDisplayName', () => {
  const custodians = [
    {
      type: 'JSONRPC',
      iconUrl: '',
      name: 'Qredo',
      website: 'https://www.qredo.com/',
      envName: 'qredo',
      apiUrl: null,
      displayName: null,
      production: false,
      refreshTokenUrl: null,
      websocketApiUrl: 'wss://websocket.dev.metamask-institutional.io/v1/ws',
      isNoteToTraderSupported: true,
      version: 2,
    },
    {
      type: 'JSONRPC',
      iconUrl:
        'https://saturn-custody-ui.dev.metamask-institutional.io/saturn.svg',
      name: 'Saturn Custody',
      website: 'https://saturn-custody-ui.dev.metamask-institutional.io/',
      envName: 'saturn',
      apiUrl: 'https://saturn-custody.dev.metamask-institutional.io/eth',
      displayName: null,
      production: false,
      refreshTokenUrl:
        'https://saturn-custody.dev.metamask-institutional.io/oauth/token',
      websocketApiUrl: 'wss://websocket.dev.metamask-institutional.io/v1/ws',
      isNoteToTraderSupported: true,
      version: 2,
    },
  ];
  it('should return the custodian if the display name is found in custodianKey', () => {
    const displayName = 'Qredo';
    const custodian = findCustodianByDisplayName(displayName, custodians);
    expect(custodian?.name).toBe('Qredo');
  });

  it('should return the custodian if the display name is found in custodianDisplayName', () => {
    const displayName = 'Saturn Custody';
    const custodian = findCustodianByDisplayName(displayName, custodians);
    expect(custodian?.name).toContain('Saturn');
  });

  it('should return null if no matching custodian is found', () => {
    const displayName = 'Non-existent Custodian';
    const custodian = findCustodianByDisplayName(displayName, custodians);
    expect(custodian).toBeNull();
  });
});
