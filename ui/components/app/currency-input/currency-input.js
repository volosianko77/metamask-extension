/* eslint-disable prefer-const */
/* eslint-disable no-constant-condition */
import React, { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import UnitInput from '../../ui/unit-input';
import CurrencyDisplay from '../../ui/currency-display';
import { I18nContext } from '../../../contexts/i18n';
import {
  getNativeCurrency,
  getProviderConfig,
} from '../../../ducks/metamask/metamask';
import {
  getCurrentChainId,
  getCurrentCurrency,
  getShouldShowFiat,
} from '../../../selectors';
import { EtherDenomination } from '../../../../shared/constants/common';
import { Numeric } from '../../../../shared/modules/Numeric';
import { useIsOriginalNativeTokenSymbol } from '../../../hooks/useIsOriginalNativeTokenSymbol';
import { formatCurrency } from '../../../helpers/utils/confirm-tx.util';
import useTokenExchangeRate from './hooks/useTokenExchangeRate';
import useProcessNewDecimalValue from './hooks/useProcessNewDecimalValue';

const NATIVE_CURRENCY_DECIMALS = 18;

/**
 * Component that allows user to enter currency values as a number, and props receive a converted
 * hex value in WEI. props.value, used as a default or forced value, should be a hex value, which
 * gets converted into a decimal value depending on the currency (ETH or Fiat).
 *
 * @param options0
 * @param options0.hexValue
 * @param options0.featureSecondary
 * @param options0.onChange
 * @param options0.onPreferenceToggle
 * @param options0.swapIcon
 * @param options0.isLongSymbol
 * @param options0.className
 * @param options0.asset
 */
export default function CurrencyInput({
  hexValue,
  featureSecondary,
  onChange,
  onPreferenceToggle,
  swapIcon,
  isLongSymbol = false,
  className = '',
  // if null, the asset is the native currency
  asset,
}) {
  const t = useContext(I18nContext);

  const assetDecimals = asset?.decimals || NATIVE_CURRENCY_DECIMALS;

  const preferredCurrency = useSelector(getNativeCurrency);
  const secondaryCurrency = useSelector(getCurrentCurrency);

  const primarySuffix =
    asset?.symbol || preferredCurrency || EtherDenomination.ETH;
  const secondarySuffix = secondaryCurrency.toUpperCase();

  const [shouldDisplayFiat, setShouldDisplayFiat] = useState(featureSecondary);
  const showFiat = useSelector(getShouldShowFiat);
  const hideSecondary = !showFiat;
  const shouldUseFiat = hideSecondary ? false : Boolean(shouldDisplayFiat);

  const [tokenDecimalValue, setTokenDecimalValue] = useState('0');
  const [fiatDecimalValue, setFiatDecimalValue] = useState('0');

  const chainId = useSelector(getCurrentChainId);
  const { ticker, type } = useSelector(getProviderConfig);
  const isOriginalNativeSymbol = useIsOriginalNativeTokenSymbol(
    chainId,
    ticker,
    type,
  );

  const tokenToFiatConversionRate = useTokenExchangeRate(asset?.address);

  const processNewDecimalValue = useProcessNewDecimalValue(
    assetDecimals,
    shouldUseFiat,
    tokenToFiatConversionRate,
  );

  const isPrimary = !shouldUseFiat;

  const swap = async () => {
    await onPreferenceToggle();
    setShouldDisplayFiat(!shouldDisplayFiat);
  };

  // if the conversion rate is undefined, do not allow a fiat input
  useEffect(() => {
    if (isPrimary) {
      return;
    }

    if (!tokenToFiatConversionRate) {
      onPreferenceToggle();
      setShouldDisplayFiat(false);
    }
  }, [tokenToFiatConversionRate, isPrimary, onPreferenceToggle]);

  const handleChange = (newDecimalValue) => {
    const { newTokenDecimalValue, newFiatDecimalValue } =
      processNewDecimalValue(newDecimalValue);
    setTokenDecimalValue(newTokenDecimalValue);
    setFiatDecimalValue(newFiatDecimalValue);

    onChange(
      new Numeric(newTokenDecimalValue, 10)
        .times(Math.pow(10, assetDecimals), 10)
        .toPrefixedHexString(),
    );
  };

  useEffect(() => {
    // do not override the input when it is using fiat, since it is imprecise
    if (shouldUseFiat) {
      return;
    }

    const decimalizedHexValue = new Numeric(hexValue, 16)
      .toBase(10)
      .shiftedBy(assetDecimals)
      .toString();

    const { newTokenDecimalValue, newFiatDecimalValue } =
      processNewDecimalValue(decimalizedHexValue);

    setTokenDecimalValue(newTokenDecimalValue);
    setFiatDecimalValue(newFiatDecimalValue);
  }, [hexValue, assetDecimals, processNewDecimalValue, shouldUseFiat]);

  const renderSwapButton = () => {
    if (!isOriginalNativeSymbol) {
      return null;
    }
    return (
      <button
        className="currency-input__swap-component"
        data-testid="currency-swap"
        onClick={swap}
      >
        <i className="fa fa-retweet fa-lg" />
      </button>
    );
  };
  const renderConversionComponent = () => {
    let suffix, displayValue;

    if (hideSecondary || !tokenToFiatConversionRate) {
      return (
        <div className="currency-input__conversion-component">
          {t('noConversionRateAvailable')}
        </div>
      );
    }
    if (!isOriginalNativeSymbol) {
      return null;
    }

    if (shouldUseFiat) {
      // Display ETH
      suffix = primarySuffix;
      displayValue = new Numeric(tokenDecimalValue, 10).toString();
    } else {
      // Display Fiat; `displayValue` bypasses calculations
      displayValue = formatCurrency(
        new Numeric(fiatDecimalValue, 10).toString(),
        secondaryCurrency,
      );
    }

    return (
      <CurrencyDisplay
        // hides the fiat suffix
        hideLabel={isPrimary || isLongSymbol}
        suffix={suffix}
        className="currency-input__conversion-component"
        displayValue={displayValue}
      />
    );
  };

  return (
    <UnitInput
      hideSuffix={isPrimary && isLongSymbol}
      dataTestId="currency-input"
      suffix={isPrimary ? primarySuffix : secondarySuffix}
      onChange={handleChange ?? onChange}
      value={shouldUseFiat ? fiatDecimalValue : tokenDecimalValue}
      className={className}
      actionComponent={swapIcon ? swapIcon(swap) : renderSwapButton()}
    >
      {renderConversionComponent()}
    </UnitInput>
  );
}

CurrencyInput.propTypes = {
  hexValue: PropTypes.string,
  featureSecondary: PropTypes.bool,
  onChange: PropTypes.func,
  onPreferenceToggle: PropTypes.func,
  swapIcon: PropTypes.func,
  isLongSymbol: PropTypes.bool,
  className: PropTypes.string,
  asset: PropTypes.shape({
    address: PropTypes.string,
    symbol: PropTypes.string,
    decimals: PropTypes.number,
    isERC721: PropTypes.bool,
  }),
};
