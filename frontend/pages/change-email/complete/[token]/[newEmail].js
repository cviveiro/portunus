import React from 'react';
import { useRouter } from 'next/router';

import CompleteChangeEmail from '@@/components/CompleteChangeEmail';

const CompleteEmailChange = () => {
  const router = useRouter();
  const { token, newEmail } = router.query;

  return <CompleteChangeEmail token={token} newEmail={newEmail} />;
};

export default CompleteEmailChange;
