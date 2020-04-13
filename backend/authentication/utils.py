import json
from urllib import parse
from urllib.parse import urlparse

from anymail.exceptions import AnymailError
from django.conf import settings
from django.core.validators import URLValidator
from django.http import HttpResponse
from django.core.mail import EmailMultiAlternatives
from django.core.exceptions import ValidationError
from django.template.loader import render_to_string
from django.contrib.auth import user_logged_in
from django.contrib.auth.password_validation import validate_password
from django.middleware.csrf import rotate_token
from django.utils.cache import patch_cache_control
from rest_framework import status as status_codes
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

from .models import User
from .errors import INVALID_PASSWORD
from .token import ResetToken


REFRESH_TOKEN_SESSION_KEY = "refresh_token"

# TODO change this when we have control of the `legalplans.com` domain.
FROM_EMAIL = "Willing <hello@willing.com>"


def make_response(success, data=None, status=None):
    if not status:
        status = status_codes.HTTP_200_OK if success else status_codes.HTTP_400_BAD_REQUEST

    response_data = {"success": success}
    if data:
        response_data.update(data)

    response = HttpResponse(json.dumps(response_data), status=status)
    patch_cache_control(response, no_cache=True, no_store=True)
    return response


def login_user(request, user):
    refresh = RefreshToken.for_user(user)
    request.session[REFRESH_TOKEN_SESSION_KEY] = str(refresh)
    rotate_token(request)
    user_logged_in.send(sender=user.__class__, request=request, user=user)


def get_valid_redirect_url(url):
    if url is None:
        return settings.DEFAULT_REDIRECT_URL

    is_valid = URLValidator()
    try:
        is_valid(url)
        if urlparse(url).hostname not in settings.VALID_REDIRECT_HOSTNAMES:
            raise ValidationError("Invalid host")
        return url
    except ValidationError:
        return settings.DEFAULT_REDIRECT_URL


def blacklist_token(token_str):
    if token_str:
        try:
            # We don't verify the token so that, no matter what, we blacklist it.
            token = RefreshToken(token_str, verify=False)
            token.blacklist()
        except TokenError:
            # Token is already blacklisted.
            pass


def blacklist_user_tokens(user):
    user_tokens = OutstandingToken.objects.filter(user__portunus_uuid=user.portunus_uuid)
    [blacklist_token(t.token) for t in user_tokens]


def create_user(portunus_uuid):
    User.objects.create_user(portunus_uuid=portunus_uuid)


def check_and_change_password(drf_request, user, new_password):
    try:
        validate_password(new_password)
    except ValidationError as e:
        return make_response(
            False,
            {
                "error": INVALID_PASSWORD,
                "validation_error": str(e.error_list[0]).strip("[]'\""),
            },
        )

    blacklist_user_tokens(user)
    user.set_password(new_password)
    user.save()

    return make_response(True)


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


def send_password_reset(user):
    # Make a one-time token linked to this user.
    token = ResetToken.for_user(user)
    reset_url = parse.urljoin(
        settings.BASE_URL, f"/reset_password/complete/{user.portunus_uuid}/{token}/",
    )
    return _send_email(
        [user.email],
        "Password Reset Request",
        "reset_password",
        {"user": user, "reset_url": reset_url,},
    )


def _send_email(to_list, subject, template_name, data):
    email_txt = render_to_string(f"reset_password.txt", data)
    email_html = render_to_string(f"reset_password.html", data)
    msg = EmailMultiAlternatives(
        subject=subject, body=email_txt, from_email=FROM_EMAIL, to=to_list,
    )
    msg.attach_alternative(email_html, "text/html")
    try:
        msg.send()
        return True
    except AnymailError:
        return False
