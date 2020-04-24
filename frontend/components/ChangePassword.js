import { useState } from 'react';

import Form from '@wui/layout/form';
import Button from '@wui/input/button';
import Spacer from '@wui/layout/spacer';
import Textbox from '@wui/input/textbox';
import Typography from '@wui/basics/typography';

import useInputFieldState from '@@/utils/hooks';
import { changePassword, refresh } from '@@/utils/API';
import { INVALID_PASSWORD } from '@@/utils/constants';
import Success from '@@/components/Success';

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

  const handleError = error => {
    if (error.response && error.response.data) {
      const submitError =
        error.response.data.error === INVALID_PASSWORD
          ? error.response.data.validation_error
          : 'Your current password did not match the one we have on file. Try again.';
      setInputErrors({ submitError });
    } else {
      setInputErrors({ non_field_errors: 'An unknown error has occurred. Please try again.' });
    }
    setSuccess(false);
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    refresh().then(() => {
      changePassword({
        password,
        new_password: newPassword,
      })
        .then(() => setSuccess(true))
        .catch(handleError);
    });
  };

  if (success) {
    return <Success header="Change Password" message="Your password has been changed!" />;
  }

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

export default ChangePasswordForm;
