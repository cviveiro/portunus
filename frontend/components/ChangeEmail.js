import { useState } from 'react';

import Form from '@wui/layout/form';
import Button from '@wui/input/button';
import Spacer from '@wui/layout/spacer';
import Textbox from '@wui/input/textbox';
import Typography from '@wui/basics/typography';

import useInputFieldState from '@@/utils/hooks';
import { refresh, changeUserEmail } from '@@/utils/API';
import Success from '@@/components/Success';

const authFailure = 'auth_failure'

const ChangeEmailForm = () => {
  const [newEmail, onChangeNewEmail] = useInputFieldState('');
  const [password, onChangePassword] = useInputFieldState('');
  const [inputErrors, setInputErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const validateForm = () => {
    const errors = {};

    if (!password) {
      errors.password = 'Please enter your current password.';
    }

    if (!newEmail) {
      errors.newEmail = 'Please enter your email address.';
    }

    setInputErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleError = error => {
    if (error.response && error.response.data) {
      const submitError =
        error.response.data.error === authFailure
          ? 'Your password did not match the one we have for your account. Try again.'
          : 'The email you entered was not valid';
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
      changeUserEmail({
        password,
        new_email: newEmail.toLowerCase(),
      })
        .then(() => setSuccess(true))
        .catch(handleError);
    });
  };

  if (success) {
    return <Success header="Change Email" message="Your email has been changed!" />;
  }

  return (
    <>
      <Typography variant="h4">Change Email</Typography>

      <Form error={inputErrors.submitError} onSubmit={handleSubmit} noMargin>
        <Textbox
          name="password"
          type="password"
          label="Current Password"
          value={password}
          onChange={onChangePassword}
          error={inputErrors.password}
        />

        <Textbox
          name="new_email"
          type="email"
          label="New Email"
          autoComplete="email"
          value={newEmail}
          onChange={onChangeNewEmail}
          error={inputErrors.newEmail}
        />

        <Button variant="contained" color="primary" type="submit" noMinWidth size="large">
          Change Email
        </Button>
      </Form>
      <Spacer v={8} />
    </>
  );
};

export default ChangeEmailForm;
