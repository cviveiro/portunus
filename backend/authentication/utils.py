import json
from fnmatch import fnmatchcase
from urllib.parse import urlparse

from axes.helpers import get_client_username
from django.conf import settings
from django.core.validators import URLValidator
from django.db.models import F
from django.http import HttpResponse
from django.core.exceptions import ValidationError
from django.contrib.auth import user_logged_in, logout
from django.contrib.auth.password_validation import validate_password
from django.middleware.csrf import rotate_token
from django.utils.cache import patch_cache_control
from rest_framework import status as status_codes
from rest_framework.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

from shared.utils.tasks import enqueue
from .models import User
from .errors import INVALID_PASSWORD, AUTH_FAILURE, AUTH_CHANGE_LOCKOUT
from .token import ResetToken
from .change_email_token import ChangeEmailToken

REFRESH_TOKEN_SESSION_KEY = "refresh_token"

# TODO change this when we have control of the `legalplans.com` domain.
FROM_EMAIL = "Willing <hello@willing.com>"


def make_response(success=True, data=None, status=None):
    if not status:
        status = status_codes.HTTP_200_OK if success else status_codes.HTTP_400_BAD_REQUEST

    response = HttpResponse(json.dumps(data), content_type="application/json", status=status)
    patch_cache_control(response, no_cache=True, no_store=True)
    return response


def login_user(request, user):
    User.objects.filter(pk=user.pk).update(auth_change_failures=0)
    user.auth_change_failures = 0

    refresh = RefreshToken.for_user(user)
    request.session[REFRESH_TOKEN_SESSION_KEY] = str(refresh)
    rotate_token(request)
    user_logged_in.send(sender=user.__class__, request=request, user=user)


def is_valid_redirect_url(url):
    if url is None:
        return False

    is_valid = URLValidator()
    try:
        is_valid(url)
        host_name = urlparse(url).hostname
        if not any(
            fnmatchcase(host_name, pattern) for pattern in settings.VALID_REDIRECT_HOSTNAMES
        ):
            raise ValidationError("Invalid host")
        return True
    except ValidationError:
        return False


def get_valid_redirect_url(url):
    if is_valid_redirect_url(url):
        return url
    return settings.DEFAULT_REDIRECT_URL


def blacklist_token(token_str):
    if token_str:
        # We don't verify the token so that, no matter what, we blacklist it.
        token = RefreshToken(token_str, verify=False)
        try:
            token.blacklist()
        except TokenError:
            # Token is already blacklisted.
            pass


def blacklist_user_tokens(user):
    user_tokens = OutstandingToken.objects.filter(user__portunus_uuid=user.portunus_uuid)
    [blacklist_token(t.token) for t in user_tokens]


def check_password_for_auth_change(request, user, password):
    if not user.check_password(password):
        User.objects.filter(pk=user.pk).update(
            auth_change_failures=F("auth_change_failures") + 1
        )
        user.auth_change_failures += 1

        if user.has_max_auth_change_failures:
            blacklist_user_tokens(request.user)
            logout(request)
            return make_response(False, {"error": AUTH_CHANGE_LOCKOUT})

        return make_response(False, {"error": AUTH_FAILURE})
    return None


def check_and_change_password(request, user, new_password):
    try:
        validate_password(new_password)
    except ValidationError as e:
        return make_response(
            False, {"error": INVALID_PASSWORD, "validation_error": e.messages[0],},
        )

    blacklist_user_tokens(user)
    user.set_password(new_password)
    user.save()

    login_user(request, user)

    return make_response(data={"next": settings.DEFAULT_REDIRECT_URL})


def check_onetime_token(token_str, user):
    if not token_str:
        return False

    # Make sure that we created and sent this token and that it matches a record
    # we have in our db.
    try:
        _ = OutstandingToken.objects.filter(
            token=token_str, user__portunus_uuid=user.portunus_uuid
        )[0]
    except IndexError:
        # No matches found, either the user id is a mismatch or the token string
        # doesn't match.
        return False

    try:
        # This will verify that the token is valid and hasn't expired.
        _ = ResetToken(token_str)
    except TokenError:
        return False

    return True


def get_username(request, credentials):
    if credentials:
        return credentials.get("email")

    return json.loads(request.body).get("email")


def generate_axes_lockout_response(request, credentials):
    enqueue(
        "authentication.tasks:force_password_reset", get_client_username(request, credentials)
    )
    error_message = (
        f"Too many failed login attempts, check your email to choose a new password."
    )
    return make_response(data={api_settings.NON_FIELD_ERRORS_KEY: error_message}, status=403)


def check_change_email_token(token_str, user):
    if not token_str:
        return False

    try:
        # This will verify that the token is valid and hasn't expired.
        token = ChangeEmailToken(token_str)
        return token["user_id"] == str(user.portunus_uuid)

    except TokenError:
        return False
