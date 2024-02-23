import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { ApprovalRequest } from '@metamask/approval-controller';
import { ApprovalType } from '@metamask/controller-utils';
import { Json } from '@metamask/utils';

import {
  latestPendingConfirmationSelector,
  pendingConfirmationsSelector,
  transactionsSelector,
  unapprovedPersonalMsgsSelector,
} from '../../../selectors';

type Approval = ApprovalRequest<Record<string, Json>>;

const useCurrentConfirmation = () => {
  const { id: paramsTransactionId } = useParams<{ id: string }>();
  const unapprovedPersonalMsgs = useSelector(unapprovedPersonalMsgsSelector);
  const pendingTransactions = useSelector(transactionsSelector);
  console.log('---------------', pendingTransactions);
  const latestPendingConfirmation: Approval = useSelector(
    latestPendingConfirmationSelector,
  );
  const pendingConfirmations: Approval[] = useSelector(
    pendingConfirmationsSelector,
  );
  const [currentConfirmation, setCurrentConfirmation] =
    useState<Record<string, unknown>>();

  useEffect(() => {
    let pendingConfirmation: Approval | undefined;
    if (paramsTransactionId) {
      if (paramsTransactionId === currentConfirmation?.id) {
        return;
      }
      pendingConfirmation = pendingConfirmations.find(
        ({ id: confirmId }) => confirmId === paramsTransactionId,
      );
    }
    if (!pendingConfirmation && latestPendingConfirmation) {
      pendingConfirmation = latestPendingConfirmation;
    }
    if (!pendingConfirmation) {
      setCurrentConfirmation(undefined);
      return;
    }
    if (pendingConfirmation.id !== currentConfirmation?.id) {
      if (pendingConfirmation.type === ApprovalType.Transaction) {
        const unapprovedTransaction = pendingTransactions.find(
          (tran: any) => tran.id === pendingConfirmation?.id,
        );
        setCurrentConfirmation(unapprovedTransaction);
        return;
      }
      // currently re-design is enabled only for personal signatures
      // condition below can be changed as we enable it for other transactions also
      const unapprovedMsg = unapprovedPersonalMsgs[pendingConfirmation.id];
      if (!unapprovedMsg) {
        setCurrentConfirmation(undefined);
        return;
      }
      const { siwe } = unapprovedMsg.msgParams;

      if (siwe?.isSIWEMessage) {
        setCurrentConfirmation(undefined);
      } else {
        setCurrentConfirmation(unapprovedMsg);
      }
    }
  }, [latestPendingConfirmation, paramsTransactionId, unapprovedPersonalMsgs]);

  return { currentConfirmation };
};

export default useCurrentConfirmation;
