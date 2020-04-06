import React from 'react';
import { useRouter } from 'next/router';

import CompleteResetPassword from '@@/components/CompleteResetPassword';
import Layout from '@@/components/Layout';

const CompletePasswordReset = () => {
  const router = useRouter();
  const { uuid, token } = router.query;

  return (
    <Layout>
      <CompleteResetPassword uuid={uuid} token={token} />
    </Layout>
  );
};

export default CompletePasswordReset;
