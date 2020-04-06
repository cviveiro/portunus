import json

from django.contrib.auth import authenticate, logout as logout_user
from django.views.decorators.http import require_POST
from django.core.exceptions import ValidationError
from rest_framework_simplejwt.views import TokenRefreshView as SimpleJWTTokenRefreshView
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes, api_view

from .models import User
from .utils import (
    login_user,
    REFRESH_TOKEN_SESSION_KEY,
    is_password_valid,
    send_password_reset,
    check_and_change_password,
    check_onetime_token,
    make_response,
    blacklist_user_tokens,
)
from .errors import INVALID_PASSWORD, AUTH_FAILURE, INVALID_TOKEN


@require_POST
def register(request):
    data = json.loads(request.body)
    if not is_password_valid(data.get("password")):
        return make_response(False, INVALID_PASSWORD)

    user = User.objects.create_user(email=data["email"], password=data["password"],)
    login_user(request, user)
    return make_response(True)


@require_POST
def login(request):
    data = json.loads(request.body)
    user = authenticate(email=data["email"], password=data["password"],)
    if not user:
        return make_response(False, AUTH_FAILURE)

    login_user(request, user)
    return make_response(True)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(drf_request):
    if drf_request.user.is_anonymous:
        return make_response(True)

    blacklist_user_tokens(drf_request.user)
    logout_user(drf_request)
    return make_response(True)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(drf_request):
    user = drf_request.user
    password = drf_request.data.get("password")
    new_password = drf_request.data.get("new_password")

    if not user.check_password(password):
        return make_response(False, AUTH_FAILURE)

    return check_and_change_password(drf_request, user, new_password)


@api_view(["POST"])
def request_password_reset(drf_request):
    email = drf_request.data.get("email")
    if not email:
        return make_response(False)

    try:
        user = User.objects.get(email=email.lower())
    except User.DoesNotExist:
        # Send back success even if the account DNE to avoid leaking user emails.
        return make_response(True)

    send_password_reset(user)
    return make_response(True)


@api_view(["POST"])
def reset_password(drf_request):
    uid = drf_request.data.get("portunus_uuid")
    token = drf_request.data.get("token")
    new_password = drf_request.data.get("new_password")
    try:
        user = User.objects.get(portunus_uuid=uid)
    except User.DoesNotExist:
        return make_response(False, AUTH_FAILURE)
    except ValidationError:
        return make_response(False)

    if not check_onetime_token(token, user):
        return make_response(False, INVALID_TOKEN)

    return check_and_change_password(drf_request, user, new_password)


class TokenRefreshView(SimpleJWTTokenRefreshView):
    """
    Pulls the refresh type JSON web token from the user session and returns an
    access type JSON web token if the refresh token is valid.
    """

    def get_serializer(self, *args, **kwargs):
        kwargs["data"] = dict(kwargs["data"])
        kwargs["data"]["refresh"] = self.request.session.get(REFRESH_TOKEN_SESSION_KEY)
        return super().get_serializer(*args, **kwargs)
