import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: 'CODE',
      verificationEmailSubject: 'Verify your Tempo account',
      verificationEmailBody: (createCode) => 
        `Welcome to Tempo!\n\nUse the verification code below to activate your developer account:\n\nVerification Code: ${createCode()}\n\nIf you did not request this code, you can safely ignore this email.`,
    },
  },
});
