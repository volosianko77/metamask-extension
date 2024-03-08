import React, { memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { Text } from '../../../../../components/component-library';
import {
  TextVariant,
  TextAlign,
  TextColor,
} from '../../../../../helpers/constants/design-system';
import { useI18nContext } from '../../../../../hooks/useI18nContext';
import { currentConfirmationSelector } from '../../../../../selectors';
import useAlerts from '../../../hooks/useAlerts';
import { BannerAlert } from '../../alerts/banner-alert';

const ConfirmTitle: React.FC = memo(() => {
  const t = useI18nContext();
  const currentConfirmation = useSelector(currentConfirmationSelector);
  const { generalAlerts } = useAlerts(currentConfirmation?.id || '');

  const typeToTitleTKey: Partial<Record<TransactionType, string>> = useMemo(
    () => ({
      [TransactionType.personalSign]: t('confirmTitleSignature'),
    }),
    [],
  );

  const typeToDescTKey: Partial<Record<TransactionType, string>> = useMemo(
    () => ({
      [TransactionType.personalSign]: t('confirmTitleDescSignature'),
    }),
    [],
  );

  if (!currentConfirmation) {
    return null;
  }

  const title = typeToTitleTKey[currentConfirmation.type];
  const description = typeToDescTKey[currentConfirmation.type];

  return (
    <>
      {generalAlerts.map((alert, index) => (
        <BannerAlert message={alert.message} key={index} />
      ))}
      <Text
        variant={TextVariant.headingLg}
        paddingTop={4}
        paddingBottom={2}
        textAlign={TextAlign.Center}
      >
        {title}
      </Text>
      <Text
        paddingBottom={4}
        color={TextColor.textAlternative}
        textAlign={TextAlign.Center}
      >
        {description}
      </Text>
    </>
  );
});

export default ConfirmTitle;
