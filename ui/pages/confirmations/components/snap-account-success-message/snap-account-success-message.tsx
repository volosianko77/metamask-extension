import React from 'react';

import { Box, Text } from '../../../../components/component-library';
import { useI18nContext } from '../../../../hooks/useI18nContext';
import { SnapAccountCard } from '../../../remove-snap-account';

const SnapAccountSuccessMessage = ({
  message,
  address,
  learnMoreLink,
}: {
  message: string;
  address: string;
  learnMoreLink?: string;
}) => {
  const t = useI18nContext();

  return (
    <Box>
      <SnapAccountCard address={address} />
      <Text>
        {message}
        {learnMoreLink === undefined ? undefined : (
          <span>
            {' '}
            <a href="{learnMoreLink}" rel="noopener noreferrer" target="_blank">
              {t('learnMoreUpperCase') as string}
            </a>
          </span>
        )}
      </Text>
    </Box>
  );
};

export default SnapAccountSuccessMessage;