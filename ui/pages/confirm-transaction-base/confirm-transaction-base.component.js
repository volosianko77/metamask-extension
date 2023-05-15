import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ConfirmPageContainer from '../../components/app/confirm-page-container';
import { isBalanceSufficient } from '../send/send.utils';
import { ASSET_ROUTE, DEFAULT_ROUTE } from '../../helpers/constants/routes';
import {
  INSUFFICIENT_FUNDS_ERROR_KEY,
  GAS_LIMIT_TOO_LOW_ERROR_KEY,
  ETH_GAS_PRICE_FETCH_WARNING_KEY,
  GAS_PRICE_FETCH_FAILURE_ERROR_KEY,
} from '../../helpers/constants/error-keys';
import UserPreferencedCurrencyDisplay from '../../components/app/user-preferenced-currency-display';

import { PRIMARY, SECONDARY } from '../../helpers/constants/common';
import TextField from '../../components/ui/text-field';
import SimulationErrorMessage from '../../components/ui/simulation-error-message';
import { MetaMetricsEventCategory } from '../../../shared/constants/metametrics';
import {
  TransactionType,
  TransactionStatus,
} from '../../../shared/constants/transaction';
import { getMethodName } from '../../helpers/utils/metrics';
import {
  getTransactionTypeTitle,
  isLegacyTransaction,
} from '../../helpers/utils/transactions.util';

import { TransactionModalContextProvider } from '../../contexts/transaction-modal';
import TransactionDetail from '../../components/app/transaction-detail/transaction-detail.component';
import TransactionDetailItem from '../../components/app/transaction-detail-item/transaction-detail-item.component';
import LoadingHeartBeat from '../../components/ui/loading-heartbeat';
import LedgerInstructionField from '../../components/app/ledger-instruction-field';
import {
  disconnectGasFeeEstimatePoller,
  getGasFeeEstimatesAndStartPolling,
  addPollingTokenToAppState,
  removePollingTokenFromAppState,
} from '../../store/actions';

import { MIN_GAS_LIMIT_DEC } from '../send/send.constants';

import { NETWORK_TO_NAME_MAP } from '../../../shared/constants/network';
import {
  addHexes,
  hexToDecimal,
} from '../../../shared/modules/conversion.utils';
import TransactionAlerts from '../../components/app/transaction-alerts';
import { ConfirmHexData } from '../../components/app/confirm-hexdata';
import { ConfirmData } from '../../components/app/confirm-data';
import { ConfirmTitle } from '../../components/app/confirm-title';
import { ConfirmSubTitle } from '../../components/app/confirm-subtitle';
import { ConfirmGasDisplay } from '../../components/app/confirm-gas-display';

import { BannerAlert } from '../../components/component-library';

export default class ConfirmTransactionBase extends Component {
  static contextTypes = {
    t: PropTypes.func,
    trackEvent: PropTypes.func,
  };

  static propTypes = {
    // react-router props
    history: PropTypes.object,
    // Redux props
    isLockedAsset: PropTypes.bool,
    balance: PropTypes.string,
    cancelTransaction: PropTypes.func,
    cancelAllTransactions: PropTypes.func,
    clearConfirmTransaction: PropTypes.func,
    conversionRate: PropTypes.number,
    fromAddress: PropTypes.string,
    fromName: PropTypes.string,
    hexTransactionAmount: PropTypes.string,
    hexMaximumTransactionFee: PropTypes.string,
    hexTransactionTotal: PropTypes.string,
    methodData: PropTypes.object,
    nonce: PropTypes.string,
    useNonceField: PropTypes.bool,
    customNonceValue: PropTypes.string,
    updateCustomNonce: PropTypes.func,
    sendTransaction: PropTypes.func,
    showTransactionConfirmedModal: PropTypes.func,
    showRejectTransactionsConfirmationModal: PropTypes.func,
    toAccounts: PropTypes.array,
    toAddress: PropTypes.string,
    tokenData: PropTypes.object,
    tokenProps: PropTypes.object,
    toName: PropTypes.string,
    toEns: PropTypes.string,
    toNickname: PropTypes.string,
    transactionStatus: PropTypes.string,
    txData: PropTypes.object,
    unapprovedTxCount: PropTypes.number,
    customGas: PropTypes.object,
    addToAddressBookIfNew: PropTypes.func,
    // Component props
    actionKey: PropTypes.string,
    contentComponent: PropTypes.node,
    dataComponent: PropTypes.node,
    dataHexComponent: PropTypes.node,
    tokenAddress: PropTypes.string,
    customTokenAmount: PropTypes.string,
    dappProposedTokenAmount: PropTypes.string,
    currentTokenBalance: PropTypes.string,
    onEdit: PropTypes.func,
    subtitleComponent: PropTypes.node,
    title: PropTypes.string,
    tokenId: PropTypes.string,
    image: PropTypes.string,
    type: PropTypes.string,
    getNextNonce: PropTypes.func,
    nextNonce: PropTypes.number,
    tryReverseResolveAddress: PropTypes.func.isRequired,
    hideSenderToRecipient: PropTypes.bool,
    showAccountInHeader: PropTypes.bool,
    mostRecentOverviewPage: PropTypes.string.isRequired,
    isEthGasPrice: PropTypes.bool,
    noGasPrice: PropTypes.bool,
    setDefaultHomeActiveTabName: PropTypes.func,
    primaryTotalTextOverride: PropTypes.string,
    secondaryTotalTextOverride: PropTypes.string,
    gasIsLoading: PropTypes.bool,
    primaryTotalTextOverrideMaxAmount: PropTypes.string,
    useNativeCurrencyAsPrimaryCurrency: PropTypes.bool,
    maxFeePerGas: PropTypes.string,
    maxPriorityFeePerGas: PropTypes.string,
    baseFeePerGas: PropTypes.string,
    gasFeeIsCustom: PropTypes.bool,
    showLedgerSteps: PropTypes.bool.isRequired,
    nativeCurrency: PropTypes.string,
    supportsEIP1559: PropTypes.bool,
    hardwareWalletRequiresConnection: PropTypes.bool,
    isMultiLayerFeeNetwork: PropTypes.bool,
    isBuyableChain: PropTypes.bool,
    isApprovalOrRejection: PropTypes.bool,
    assetStandard: PropTypes.string,
    useCurrencyRateCheck: PropTypes.bool,
  };

  state = {
    submitting: false,
    submitError: null,
    submitWarning: '',
    ethGasPriceWarning: '',
    editingGas: false,
    userAcknowledgedGasMissing: false,
    showWarningModal: false,
  };

  componentDidUpdate(prevProps) {
    const {
      transactionStatus,
      showTransactionConfirmedModal,
      history,
      clearConfirmTransaction,
      nextNonce,
      customNonceValue,
      toAddress,
      tryReverseResolveAddress,
      isEthGasPrice,
      setDefaultHomeActiveTabName,
    } = this.props;
    const {
      customNonceValue: prevCustomNonceValue,
      nextNonce: prevNextNonce,
      toAddress: prevToAddress,
      transactionStatus: prevTxStatus,
      isEthGasPrice: prevIsEthGasPrice,
    } = prevProps;
    const statusUpdated = transactionStatus !== prevTxStatus;
    const txDroppedOrConfirmed =
      transactionStatus === TransactionStatus.dropped ||
      transactionStatus === TransactionStatus.confirmed;

    if (
      nextNonce !== prevNextNonce ||
      customNonceValue !== prevCustomNonceValue
    ) {
      if (nextNonce !== null && customNonceValue > nextNonce) {
        this.setState({
          submitWarning: this.context.t('nextNonceWarning', [nextNonce]),
        });
      } else {
        this.setState({ submitWarning: '' });
      }
    }

    if (statusUpdated && txDroppedOrConfirmed) {
      showTransactionConfirmedModal({
        onSubmit: () => {
          clearConfirmTransaction();
          setDefaultHomeActiveTabName('activity').then(() => {
            history.push(DEFAULT_ROUTE);
          });
        },
      });
    }

    if (toAddress && toAddress !== prevToAddress) {
      tryReverseResolveAddress(toAddress);
    }

    if (isEthGasPrice !== prevIsEthGasPrice) {
      if (isEthGasPrice) {
        this.setState({
          ethGasPriceWarning: this.context.t(ETH_GAS_PRICE_FETCH_WARNING_KEY),
        });
      } else {
        this.setState({
          ethGasPriceWarning: '',
        });
      }
    }
  }

  getErrorKey() {
    const {
      balance,
      conversionRate,
      hexMaximumTransactionFee,
      txData: { txParams: { value: amount } = {} } = {},
      customGas,
      noGasPrice,
      gasFeeIsCustom,
    } = this.props;

    const insufficientBalance =
      balance &&
      !isBalanceSufficient({
        amount,
        gasTotal: hexMaximumTransactionFee || '0x0',
        balance,
        conversionRate,
      });

    if (insufficientBalance) {
      return {
        valid: false,
        errorKey: INSUFFICIENT_FUNDS_ERROR_KEY,
      };
    }

    if (hexToDecimal(customGas.gasLimit) < Number(MIN_GAS_LIMIT_DEC)) {
      return {
        valid: false,
        errorKey: GAS_LIMIT_TOO_LOW_ERROR_KEY,
      };
    }

    if (noGasPrice && !gasFeeIsCustom) {
      return {
        valid: false,
        errorKey: GAS_PRICE_FETCH_FAILURE_ERROR_KEY,
      };
    }

    return {
      valid: true,
    };
  }

  handleEditGas() {
    const {
      actionKey,
      txData: { origin },
      methodData = {},
    } = this.props;

    this.context.trackEvent({
      category: MetaMetricsEventCategory.Transactions,
      event: 'User clicks "Edit" on gas',
      properties: {
        action: 'Confirm Screen',
        legacy_event: true,
        recipientKnown: null,
        functionType:
          actionKey ||
          getMethodName(methodData.name) ||
          TransactionType.contractInteraction,
        origin,
      },
    });

    this.setState({ editingGas: true });
  }

  handleCloseEditGas() {
    this.setState({ editingGas: false });
  }

  setUserAcknowledgedGasMissing() {
    this.setState({ userAcknowledgedGasMissing: true });
  }

  renderDetails() {
    const {
      primaryTotalTextOverride,
      secondaryTotalTextOverride,
      hexMaximumTransactionFee,
      hexTransactionTotal,
      useNonceField,
      customNonceValue,
      updateCustomNonce,
      nextNonce,
      getNextNonce,
      txData,
      useNativeCurrencyAsPrimaryCurrency,
      primaryTotalTextOverrideMaxAmount,
      showLedgerSteps,
      isMultiLayerFeeNetwork,
      nativeCurrency,
      isBuyableChain,
      useCurrencyRateCheck,
    } = this.props;
    const { t } = this.context;
    const { userAcknowledgedGasMissing } = this.state;

    const { valid } = this.getErrorKey();
    const isDisabled = () => {
      return userAcknowledgedGasMissing ? false : !valid;
    };

    const hasSimulationError = Boolean(txData.simulationFails);

    const renderSimulationFailureWarning =
      hasSimulationError && !userAcknowledgedGasMissing;
    const networkName = NETWORK_TO_NAME_MAP[txData.chainId];

    const renderTotalMaxAmount = () => {
      if (
        primaryTotalTextOverrideMaxAmount === undefined &&
        secondaryTotalTextOverride === undefined
      ) {
        // Native Send
        return (
          <UserPreferencedCurrencyDisplay
            type={PRIMARY}
            key="total-max-amount"
            value={addHexes(txData.txParams.value, hexMaximumTransactionFee)}
            hideLabel={!useNativeCurrencyAsPrimaryCurrency}
          />
        );
      }

      // Token send
      return useNativeCurrencyAsPrimaryCurrency
        ? primaryTotalTextOverrideMaxAmount
        : secondaryTotalTextOverride;
    };

    const renderTotalDetailTotal = () => {
      if (
        primaryTotalTextOverride === undefined &&
        secondaryTotalTextOverride === undefined
      ) {
        return (
          <div className="confirm-page-container-content__total-value">
            <LoadingHeartBeat estimateUsed={this.props.txData?.userFeeLevel} />
            <UserPreferencedCurrencyDisplay
              type={PRIMARY}
              key="total-detail-value"
              value={hexTransactionTotal}
              hideLabel={!useNativeCurrencyAsPrimaryCurrency}
            />
          </div>
        );
      }
      return useNativeCurrencyAsPrimaryCurrency
        ? primaryTotalTextOverride
        : secondaryTotalTextOverride;
    };

    const renderTotalDetailText = () => {
      if (
        primaryTotalTextOverride === undefined &&
        secondaryTotalTextOverride === undefined
      ) {
        return (
          <div className="confirm-page-container-content__total-value">
            <LoadingHeartBeat estimateUsed={this.props.txData?.userFeeLevel} />
            <UserPreferencedCurrencyDisplay
              type={SECONDARY}
              key="total-detail-text"
              value={hexTransactionTotal}
              hideLabel={Boolean(useNativeCurrencyAsPrimaryCurrency)}
            />
          </div>
        );
      }
      return useNativeCurrencyAsPrimaryCurrency
        ? secondaryTotalTextOverride
        : primaryTotalTextOverride;
    };

    const nonceField = useNonceField ? (
      <div>
        <div className="confirm-detail-row">
          <div className="confirm-detail-row__label">
            {t('nonceFieldHeading')}
          </div>
          <div className="custom-nonce-input">
            <TextField
              type="number"
              min={0}
              placeholder={
                typeof nextNonce === 'number' ? nextNonce.toString() : null
              }
              onChange={({ target: { value } }) => {
                if (!value.length || Number(value) < 0) {
                  updateCustomNonce('');
                } else {
                  updateCustomNonce(String(Math.floor(value)));
                }
                getNextNonce();
              }}
              fullWidth
              margin="dense"
              value={customNonceValue || ''}
            />
          </div>
        </div>
      </div>
    ) : null;

    const simulationFailureWarning = () => (
      <div className="confirm-page-container-content__error-container">
        <SimulationErrorMessage
          userAcknowledgedGasMissing={userAcknowledgedGasMissing}
          setUserAcknowledgedGasMissing={() =>
            this.setUserAcknowledgedGasMissing()
          }
        />
      </div>
    );

    return (
      <div className="confirm-page-container-content__details">
        <TransactionAlerts
          setUserAcknowledgedGasMissing={() =>
            this.setUserAcknowledgedGasMissing()
          }
          userAcknowledgedGasMissing={userAcknowledgedGasMissing}
          nativeCurrency={nativeCurrency}
          networkName={networkName}
          type={txData.type}
          isBuyableChain={isBuyableChain}
        />
        <TransactionDetail
          disabled={isDisabled()}
          userAcknowledgedGasMissing={userAcknowledgedGasMissing}
          onEdit={
            renderSimulationFailureWarning ? null : () => this.handleEditGas()
          }
          rows={[
            renderSimulationFailureWarning && simulationFailureWarning(),
            !renderSimulationFailureWarning && (
              <ConfirmGasDisplay
                userAcknowledgedGasMissing={userAcknowledgedGasMissing}
              />
            ),
            !isMultiLayerFeeNetwork && (
              <TransactionDetailItem
                key="confirm-transaction-base-total-item"
                detailTitle={t('total')}
                detailText={useCurrencyRateCheck && renderTotalDetailText()}
                detailTotal={renderTotalDetailTotal()}
                subTitle={t('transactionDetailGasTotalSubtitle')}
                subText={
                  <div className="confirm-page-container-content__total-amount">
                    <LoadingHeartBeat
                      estimateUsed={this.props.txData?.userFeeLevel}
                    />
                    <strong key="editGasSubTextAmountLabel">
                      {t('editGasSubTextAmountLabel')}
                    </strong>{' '}
                    {renderTotalMaxAmount()}
                  </div>
                }
              />
            ),
          ]}
        />
        {nonceField}
        {showLedgerSteps ? (
          <LedgerInstructionField
            showDataInstruction={Boolean(txData.txParams?.data)}
          />
        ) : null}
      </div>
    );
  }

  renderData() {
    const { txData, dataComponent } = this.props;
    const {
      txParams: { data },
    } = txData;
    if (!data) {
      return null;
    }
    return <ConfirmData txData={txData} dataComponent={dataComponent} />;
  }

  renderDataHex() {
    const { txData, dataHexComponent } = this.props;
    const {
      txParams: { data, to },
    } = txData;
    if (!data || !to) {
      return null;
    }
    return (
      <ConfirmHexData txData={txData} dataHexComponent={dataHexComponent} />
    );
  }

  handleEdit() {
    const {
      txData,
      tokenData,
      tokenProps,
      onEdit,
      actionKey,
      txData: { origin },
      methodData = {},
    } = this.props;

    this.context.trackEvent({
      category: MetaMetricsEventCategory.Transactions,
      event: 'Edit Transaction',
      properties: {
        action: 'Confirm Screen',
        legacy_event: true,
        recipientKnown: null,
        functionType:
          actionKey ||
          getMethodName(methodData.name) ||
          TransactionType.contractInteraction,
        origin,
      },
    });

    onEdit({ txData, tokenData, tokenProps });
  }

  handleCancelAll() {
    const {
      cancelAllTransactions,
      clearConfirmTransaction,
      history,
      mostRecentOverviewPage,
      showRejectTransactionsConfirmationModal,
      unapprovedTxCount,
    } = this.props;

    showRejectTransactionsConfirmationModal({
      unapprovedTxCount,
      onSubmit: async () => {
        this._removeBeforeUnload();
        await cancelAllTransactions();
        clearConfirmTransaction();
        history.push(mostRecentOverviewPage);
      },
    });
  }

  handleCancel() {
    const {
      txData,
      cancelTransaction,
      history,
      mostRecentOverviewPage,
      updateCustomNonce,
    } = this.props;

    this._removeBeforeUnload();
    updateCustomNonce('');
    cancelTransaction(txData).then(() => {
      history.push(mostRecentOverviewPage);
    });
  }

  handleSubmit() {
    const {
      sendTransaction,
      txData,
      history,
      mostRecentOverviewPage,
      updateCustomNonce,
      maxFeePerGas,
      customTokenAmount,
      dappProposedTokenAmount,
      currentTokenBalance,
      maxPriorityFeePerGas,
      baseFeePerGas,
      methodData,
      addToAddressBookIfNew,
      toAccounts,
      toAddress,
    } = this.props;
    const { submitting } = this.state;
    const { name } = methodData;

    if (txData.type === TransactionType.simpleSend) {
      addToAddressBookIfNew(toAddress, toAccounts);
    }
    if (submitting) {
      return;
    }

    if (baseFeePerGas) {
      txData.estimatedBaseFee = baseFeePerGas;
    }

    if (name) {
      txData.contractMethodName = name;
    }

    if (dappProposedTokenAmount) {
      txData.dappProposedTokenAmount = dappProposedTokenAmount;
      txData.originalApprovalAmount = dappProposedTokenAmount;
    }

    if (customTokenAmount) {
      txData.customTokenAmount = customTokenAmount;
      txData.finalApprovalAmount = customTokenAmount;
    } else if (dappProposedTokenAmount !== undefined) {
      txData.finalApprovalAmount = dappProposedTokenAmount;
    }

    if (currentTokenBalance) {
      txData.currentTokenBalance = currentTokenBalance;
    }

    if (maxFeePerGas) {
      txData.txParams = {
        ...txData.txParams,
        maxFeePerGas,
      };
    }

    if (maxPriorityFeePerGas) {
      txData.txParams = {
        ...txData.txParams,
        maxPriorityFeePerGas,
      };
    }

    this.setState(
      {
        submitting: true,
        submitError: null,
      },
      () => {
        this._removeBeforeUnload();

        sendTransaction(txData)
          .then(() => {
            if (!this._isMounted) {
              return;
            }

            this.setState(
              {
                submitting: false,
              },
              () => {
                history.push(mostRecentOverviewPage);
                updateCustomNonce('');
              },
            );
          })
          .catch((error) => {
            if (!this._isMounted) {
              return;
            }

            this.setState({
              submitting: false,
              submitError: error.message,
            });
            updateCustomNonce('');
          });
      },
    );
  }

  handleSetApprovalForAll() {
    this.setState({ showWarningModal: true });
  }

  renderTitleComponent() {
    const { title, hexTransactionAmount, txData } = this.props;

    return (
      <ConfirmTitle
        title={title}
        hexTransactionAmount={hexTransactionAmount}
        txData={txData}
      />
    );
  }

  renderSubtitleComponent() {
    const { subtitleComponent, hexTransactionAmount, txData } = this.props;

    return (
      <ConfirmSubTitle
        hexTransactionAmount={hexTransactionAmount}
        subtitleComponent={subtitleComponent}
        txData={txData}
      />
    );
  }

  _beforeUnloadForGasPolling = () => {
    this._isMounted = false;
    if (this.state.pollingToken) {
      disconnectGasFeeEstimatePoller(this.state.pollingToken);
      removePollingTokenFromAppState(this.state.pollingToken);
    }
  };

  _removeBeforeUnload = () => {
    window.removeEventListener('beforeunload', this._beforeUnloadForGasPolling);
  };

  componentDidMount() {
    this._isMounted = true;
    const {
      toAddress,
      txData: { origin } = {},
      getNextNonce,
      tryReverseResolveAddress,
    } = this.props;
    const { trackEvent } = this.context;
    trackEvent({
      category: MetaMetricsEventCategory.Transactions,
      event: 'Confirm: Started',
      properties: {
        action: 'Confirm Screen',
        legacy_event: true,
        origin,
      },
    });

    getNextNonce();
    if (toAddress) {
      tryReverseResolveAddress(toAddress);
    }

    /**
     * This makes a request to get estimates and begin polling, keeping track of the poll
     * token in component state.
     * It then disconnects polling upon componentWillUnmount. If the hook is unmounted
     * while waiting for `getGasFeeEstimatesAndStartPolling` to resolve, the `_isMounted`
     * flag ensures that a call to disconnect happens after promise resolution.
     */
    getGasFeeEstimatesAndStartPolling().then((pollingToken) => {
      if (this._isMounted) {
        addPollingTokenToAppState(pollingToken);
        this.setState({ pollingToken });
      } else {
        disconnectGasFeeEstimatePoller(pollingToken);
        removePollingTokenFromAppState(this.state.pollingToken);
      }
    });
    window.addEventListener('beforeunload', this._beforeUnloadForGasPolling);
  }

  componentWillUnmount() {
    this._beforeUnloadForGasPolling();
    this._removeBeforeUnload();
    this.props.clearConfirmTransaction();
  }

  supportsEIP1559 =
    this.props.supportsEIP1559 && !isLegacyTransaction(this.props.txData);

  render() {
    const { t } = this.context;
    const {
      fromName,
      fromAddress,
      toName,
      toAddress,
      toEns,
      toNickname,
      methodData,
      tokenAddress,
      contentComponent,
      onEdit,
      nonce,
      customNonceValue,
      unapprovedTxCount,
      type,
      hideSenderToRecipient,
      showAccountInHeader,
      txData,
      gasIsLoading,
      gasFeeIsCustom,
      nativeCurrency,
      hardwareWalletRequiresConnection,
      image,
      isApprovalOrRejection,
      assetStandard,
      title,
      isLockedAsset,
      history,
      tokenId,
    } = this.props;
    const {
      submitting,
      submitError,
      submitWarning,
      ethGasPriceWarning,
      editingGas,
      userAcknowledgedGasMissing,
      showWarningModal,
    } = this.state;

    const { name } = methodData;
    const { valid, errorKey } = this.getErrorKey();
    const hasSimulationError = Boolean(txData.simulationFails);
    const renderSimulationFailureWarning =
      hasSimulationError && !userAcknowledgedGasMissing;

    // This `isTokenApproval` case is added to handle possible rendering of this component from
    // confirm-approve.js when `assetStandard` is `undefined`. That will happen if the request to
    // get the asset standard fails. In that scenario, confirm-approve.js returns the `<ConfirmContractInteraction />`
    // component, which in turn returns this `<ConfirmTransactionBase />` component. We meed to prevent
    // the user from editing the transaction in those cases.

    // as this component is made functional, useTransactionFunctionType can be used to get functionType
    const isTokenApproval =
      txData.type === TransactionType.tokenMethodSetApprovalForAll ||
      txData.type === TransactionType.tokenMethodApprove;

    const isContractInteraction =
      txData.type === TransactionType.contractInteraction;

    const isContractInteractionFromDapp =
      (isTokenApproval || isContractInteraction) &&
      txData.origin !== 'metamask';
    let functionType;
    if (isContractInteractionFromDapp) {
      functionType = getMethodName(name);
    }

    if (!functionType) {
      if (type) {
        functionType = getTransactionTypeTitle(t, type, nativeCurrency);
      } else {
        functionType = t('contractInteraction');
      }
    }

    const warning = isLockedAsset ? (
      <BannerAlert
        severity="warning"
        title={t('lockedAssetTxWarning1')}
        actionButtonLabel={t('lockedAssetTxWarning3')}
        actionButtonOnClick={() =>
          history.push(
            `${ASSET_ROUTE}/${tokenAddress}${tokenId ? `/${tokenId}` : ''}`,
          )
        }
      >
        {t('lockedAssetTxWarning2')}
      </BannerAlert>
    ) : (
      submitWarning
    );
    return (
      <TransactionModalContextProvider>
        <ConfirmPageContainer
          fromName={fromName}
          fromAddress={fromAddress}
          showAccountInHeader={showAccountInHeader}
          toName={toName}
          toAddress={toAddress}
          toEns={toEns}
          toNickname={toNickname}
          showEdit={!isContractInteractionFromDapp && Boolean(onEdit)}
          action={functionType}
          image={image}
          title={title}
          titleComponent={this.renderTitleComponent()}
          subtitleComponent={this.renderSubtitleComponent()}
          detailsComponent={this.renderDetails()}
          dataComponent={this.renderData(functionType)}
          dataHexComponent={this.renderDataHex(functionType)}
          contentComponent={contentComponent}
          nonce={customNonceValue || nonce}
          unapprovedTxCount={unapprovedTxCount}
          tokenAddress={tokenAddress}
          errorMessage={submitError}
          errorKey={errorKey}
          hasSimulationError={hasSimulationError}
          warning={warning}
          disabled={
            renderSimulationFailureWarning ||
            !valid ||
            submitting ||
            hardwareWalletRequiresConnection ||
            (gasIsLoading && !gasFeeIsCustom) ||
            isLockedAsset
          }
          onEdit={() => this.handleEdit()}
          onCancelAll={() => this.handleCancelAll()}
          onCancel={() => this.handleCancel()}
          onSubmit={() => this.handleSubmit()}
          onSetApprovalForAll={() => this.handleSetApprovalForAll()}
          showWarningModal={showWarningModal}
          hideSenderToRecipient={hideSenderToRecipient}
          origin={txData.origin}
          ethGasPriceWarning={ethGasPriceWarning}
          editingGas={editingGas}
          handleCloseEditGas={() => this.handleCloseEditGas()}
          currentTransaction={txData}
          supportsEIP1559={this.supportsEIP1559}
          nativeCurrency={nativeCurrency}
          isApprovalOrRejection={isApprovalOrRejection}
          assetStandard={assetStandard}
          txData={txData}
        />
      </TransactionModalContextProvider>
    );
  }
}
