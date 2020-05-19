from urllib import parse

from .mailer import Mailer
from authentication.utils import ResetToken, ChangeEmailToken
from backend.settings import SUPPORT_PHONE_NUMBER, BASE_URL


class PortunusMailer(Mailer):
    @classmethod
    def send_email(cls, to, subject, template, context, bcc=None, attachments=None):
        email_context = {"support_phone_number": SUPPORT_PHONE_NUMBER}
        email_context.update(context)
        Mailer.send_email(to, subject, template, context, bcc, attachments)

    @classmethod
    def generate_password_reset_url(cls, user):
        # Make a one-time token linked to this user.
        token = ResetToken.for_user(user)
        return parse.urljoin(
            BASE_URL, f"/reset-password/complete/{user.portunus_uuid}/{token}/",
        )

    @classmethod
    def send_password_reset(cls, user):
        cls.send_email(
            [user.email],
            "Password Reset Request",
            "reset_password",
            {"user": user, "reset_url": cls.generate_password_reset_url(user)},
        )

    @classmethod
    def send_lockout_email(cls, user):
        cls.send_email(
            [user.email],
            "Choose a New Password",
            "email_lockout",
            {"user": user, "reset_url": cls.generate_password_reset_url(user)},
        )

    @classmethod
    def send_account_creation_notice(cls, user):
        token = ResetToken.for_user(user)
        new_account_url = parse.urljoin(
            BASE_URL, f"/set-password/{user.portunus_uuid}/{token}",
        )
        cls.send_email(
            [user.email],
            "Account Created",
            "new_account",
            {"user": user, "new_account_url": new_account_url},
        )

    @classmethod
    def send_change_email_confirmation(cls, user, new_email):
        token = ChangeEmailToken.for_user(user)
        confirm_new_email_url = parse.urljoin(
            BASE_URL, f"/change-email/complete/{token}/{new_email}/",
        )
        cls.send_email(
            [new_email],
            "Change Email Request",
            "change_email",
            {"user": user, "confirm_new_email_url": confirm_new_email_url},
        )
