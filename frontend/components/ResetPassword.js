import React, { useState } from 'react';
import useInputFieldState from '../utils/hooks';
import { resetPassword } from '../utils/API';

import Form from '@wui/layout/form';
import Button from '@wui/input/button';
import Spacer from '@wui/layout/spacer';
import Textbox from '@wui/input/textbox';
import Typography from '@wui/basics/typography';

const ResetPassword = () => {
  const [email, onChangeEmail] = useInputFieldState('');
  const [inputError, setInputError] = useState('');
  const [validationError, setValidationError] = useState(null);
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    let error = '';
    if (!email) {
      error = 'Please enter your email';
    }

    setInputError(error);

    return !error;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validateForm()) {
      setSuccess(false);
      return;
    }
    try {
      await resetPassword({
        email: email.toLowerCase(),
      });
      setSuccess(true);
      setValidationError(null);
    } catch (error) {
      setValidationError('ERROR');
      setSuccess(false);
    }
  };

  const resetForm = () => {
    return (
      <div>
        <Typography variant="h4">Reset Password</Typography>
        <Form error={validationError} onSubmit={handleSubmit} noMargin>
          <Textbox
            name="email"
            type="email"
            label="Email"
            autoComplete="username"
            value={email}
            onChange={onChangeEmail}
            error={inputError}
          />
          <Spacer v={8} />
          <Button variant="contained" color="primary" type="submit" noMinWidth size="large">
            Reset Password
          </Button>
        </Form>
        <Spacer v={16} />
      </div>
    );
  };

  const successMessage = () => {
    return (
      <div>
        <Typography variant="h4">Reset Password</Typography>
        <body>Check your email for your password reset link</body>
      </div>
    );
  };

  return success ? successMessage() : resetForm();
};

export default ResetPassword;
