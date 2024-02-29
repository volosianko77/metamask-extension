import React from 'react';

import ScrollToBottom from '../components/confirm/scroll-to-bottom';
import { Header } from '../components/confirm/header';
import { Info } from '../components/confirm/info';
import { Title } from '../components/confirm/title';
import { Box } from '../../../components/component-library';
import { Content, Page } from '../../../components/multichain/pages/page';
import { BackgroundColor } from '../../../helpers/constants/design-system';
import { Footer } from '../components/confirm/footer';
import setCurrentConfirmation from '../hooks/setCurrentConfirmation';
import syncConfirmPath from '../hooks/syncConfirmPath';

const Confirm = () => {
  setCurrentConfirmation();
  syncConfirmPath();

  return (
    <Page backgroundColor={BackgroundColor.backgroundAlternative}>
      <Header />
      <Title />
      <Content backgroundColor={BackgroundColor.backgroundAlternative}>
        <ScrollToBottom>
          <Box padding={4}>
            <Info />
          </Box>
        </ScrollToBottom>
      </Content>
      <Footer />
    </Page>
  );
};

export default Confirm;
