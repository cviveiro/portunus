import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';

import Form from '@wui/layout/form';
import Button from '@wui/input/button';
import Spacer from '@wui/layout/spacer';
import Textbox from '@wui/input/textbox';
import Typography from '@wui/basics/typography';
import useInputFieldState from '../utils/hooks';
import { completePasswordReset } from '../utils/API';

const ResetPasswordComplete = ({ uuid, token }) => {
  const [newPassword1, onChangePassword1] = useInputFieldState('');
  const [newPassword2, onChangePassword2] = useInputFieldState('');
  const [inputErrors, setInputErrors] = useState({});
  const [validationError, setValidationError] = useState(null);
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    const errors = {};

    if (!newPassword1) {
      errors.firstPassword = 'Please enter your email';
    }

    if (newPassword1 !== newPassword2) {
      errors.secondPassword = 'Passwords do not match!';
    }

    setInputErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleNewPassword = async e => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    try {
      await completePasswordReset({
        new_password: newPassword1,
        portunus_uuid: uuid,
        token,
      });
      setValidationError(null);
      setSuccess(true);
    } catch (error) {
      setValidationError('ERROR');
    }
  };

  const successMessage = () => {
    return (
      <div>
        <Typography variant="h4">Reset Password</Typography>
        <body>Password reset complete!</body>
        <Spacer v={16} />
        <Typography>
          <Link href="/login">
            <a>Login</a>
          </Link>
        </Typography>
      </div>
    );
  };

  const newPasswordForm = () => {
    return (
      <div>
        <Typography variant="h4">Set New Password</Typography>
        <Form error={validationError} onSubmit={handleNewPassword} noMargin>
          <Textbox
            name="new_password"
            type="password"
            label="New Password"
            value={newPassword1}
            onChange={onChangePassword1}
            error={inputErrors.firstPassword}
          />
          <Textbox
            name="confirmed_password"
            type="password"
            label="Confirm New Password"
            value={newPassword2}
            onChange={onChangePassword2}
            error={inputErrors.secondPassword}
          />
          <Spacer v={8} />
          <Button variant="contained" color="primary" type="submit" noMinWidth size="large">
            Reset Password
          </Button>
        </Form>
      </div>
    );
  };

  return success ? successMessage() : newPasswordForm();
};

ResetPasswordComplete.propTypes = {
  uuid: PropTypes.string.isRequired,
  token: PropTypes.string.isRequired,
};

export default ResetPasswordComplete;
