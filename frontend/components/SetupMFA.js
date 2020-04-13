import React, { useState, useEffect } from 'react';

import Form from '@wui/layout/form';
import Button from '@wui/input/button';
import Textbox from '@wui/input/textbox';
import Typography from '@wui/basics/typography';

import useInputFieldState from '@@/utils/hooks';
import { activateMFA, completeActivateMFA } from '@@/utils/API';

const SetupMFAForm = () => {
  const [activationCode, onChangeActivationCode] = useInputFieldState('');
  const [success, setSuccess] = useState(false);
  const [inputError, setInputError] = useState('');
  const [validationError, setValidationError] = useState(null);

  // TODO we'll need to get the desired method.
  const method = 'email';

  useEffect(() => {
    try {
      activateMFA(method);
    } catch (error) {
      console.log('Error!');
    }
  }, []);

  const validateCodeForm = () => {
    let error = '';

    if (!activationCode) {
      error = 'Please enter the activation code you received.';
    }

    setInputError(error);

    return !error;
  };

  const handleActivationCode = async e => {
    e.preventDefault();
    if (!validateCodeForm()) {
      return;
    }

    let response;
    try {
      response = await completeActivateMFA(method, { code: activationCode });
      setSuccess(true);
    } catch (error) {
      setValidationError('Error');
    }
  };

  const successMessage = () => {
    return (
      <div>
        <Typography variant="h4">Setup Multi-Factor Authentication</Typography>
        <body>Setup complete!</body>
      </div>
    );
  };

  const activationCodeForm = () => {
    return (
      <div>
        <Typography variant="h4">Set Up Multi-Factor Authentication</Typography>
        <body>An activation code has been sent to your email</body>
        <Form error={validationError} onSubmit={handleActivationCode} noMargin>
          <Textbox
            name="activation_code"
            type="text"
            label="Activation Code"
            value={activationCode}
            onChange={onChangeActivationCode}
            error={inputError}
          />
          <Button variant="contained" color="primary" type="submit" noMinWidth size="large">
            Complete MFA Setup
          </Button>
        </Form>
      </div>
    );
  };

  return success ? successMessage() : activationCodeForm();
};

export default SetupMFAForm;
