import { ENV, isTest } from '../config/env';

export interface VerificationEmailPayload {
  to: string;
  fullName: string;
  token: string;
}

export const sentVerificationEmails: VerificationEmailPayload[] = [];

export const sendVerificationEmail = async (
  payload: VerificationEmailPayload
): Promise<void> => {
  if (isTest) {
    sentVerificationEmails.push(payload);
    return;
  }

  const verifyUrl = `${ENV.CLIENT_URL}/verify-email?token=${payload.token}`;
  // eslint-disable-next-line no-console
  console.log(
    `\n📧 [dev mailer] Verification email for ${payload.to}\n   Name: ${payload.fullName}\n   Link: ${verifyUrl}\n`
  );
};

export const _resetMailboxForTests = (): void => {
  sentVerificationEmails.length = 0;
};
