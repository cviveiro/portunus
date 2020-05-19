from datetime import timedelta

from rest_framework_simplejwt.tokens import Token

RESET_LINK_VALID_MINUTES = 5


# Not inheriting the BlacklistMixin class so the token will not be included in the outstanding token
# list so that it doesn't get cleared on logout.  If the user logs out before clicking the verification
# link, we still want the link (and token) to be valid.
class ChangeEmailToken(Token):
    token_type = "change_email"
    lifetime = timedelta(minutes=RESET_LINK_VALID_MINUTES)
