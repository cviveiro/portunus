import React, { useState } from 'react';

import Form from '@wui/layout/form';
import Button from '@wui/input/button';
import Spacer from '@wui/layout/spacer';
import Textbox from '@wui/input/textbox';
import Typography from '@wui/basics/typography';

import useInputFieldState from '@@/utils/hooks';
import { changePassword, refresh } from '@@/utils/API';
import { invalidPasswordError } from '@@/utils/constants';

const ChangePasswordForm = () => {
  const [password, onChangePassword] = useInputFieldState('');
  const [newPassword, onChangeNewPassword] = useInputFieldState('');
  const [newPassword2, onChangeNewPassword2] = useInputFieldState('');
  const [inputErrors, setInputErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    const errors = {};

    if (!password) {
      errors.password = 'Please enter your current password.';
    }

    if (!newPassword) {
      errors.newPassword = 'Please enter a new password.';
    } else if (!newPassword2) {
      errors.newPassword2 = 'Please re-enter your new password.';
    } else if (newPassword !== newPassword2) {
      errors.newPassword2 = 'The two passwords you entered do not match.';
    }

    setInputErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    try {
      await refresh();
      await changePassword({
        password,
        new_password: newPassword,
      });
      setSuccess(true);
    } catch (error) {
      const submitError =
        error.response.data.error === invalidPasswordError
          ? error.response.data.validation_error
          : 'Your current password did not match the one we have on file. Try again.';
      setInputErrors({ submitError });
    }
  };

  const successMessage = () => {
    return (
      <div>
        <Typography variant="h4">Change Password</Typography>
        <body>Your password has been changed!</body>
      </div>
    );
  };

  const changeForm = () => {
    return (
      <div>
        <Typography variant="h4">Change Password</Typography>
        <Form error={inputErrors.submitError} onSubmit={handleSubmit} noMargin>
          <Textbox
            name="current_password"
            type="password"
            label="Current Password"
            value={password}
            onChange={onChangePassword}
            error={inputErrors.password}
          />
          <Textbox
            name="new_password"
            type="password"
            label="New Password"
            value={newPassword}
            onChange={onChangeNewPassword}
            error={inputErrors.newPassword}
          />
          <Textbox
            name="new_password_2"
            type="password"
            label="Confirm New Password"
            value={newPassword2}
            onChange={onChangeNewPassword2}
            error={inputErrors.newPassword2}
          />
          <Spacer v={8} />
          <Button variant="contained" color="primary" type="submit" noMinWidth size="large">
            Change Password
          </Button>
        </Form>
      </div>
    );
  };

  return success ? successMessage() : changeForm();
};

export default ChangePasswordForm;
