import json

from django.contrib.auth import logout as logout_user
from django.views.decorators.http import require_POST
from django.core.exceptions import ValidationError
from rest_framework_simplejwt.views import TokenRefreshView as SimpleJWTTokenRefreshView
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes, api_view

from .serializers import (
    RegistrationSerializer,
    LoginSerializer,
    SocialAuthSerializer,
    ChangeEmailSerializer,
)
from .models import User
from .utils import (
    login_user,
    REFRESH_TOKEN_SESSION_KEY,
    send_password_reset,
    check_and_change_password,
    check_onetime_token,
    make_response,
    blacklist_user_tokens,
    get_valid_redirect_url,
)
from .errors import AUTH_FAILURE, INVALID_TOKEN


def make_auth_view(serializer_class):
    @require_POST
    def view(request):
        data = json.loads(request.body)
        serializer = serializer_class(data=data)

        if not serializer.is_valid():
            first_errors = {k: v[0] for k, v in serializer.errors.items()}
            return make_response(False, first_errors)

        user = serializer.save()
        login_user(request, user)
        next_url = get_valid_redirect_url(data.get("next"))
        return make_response(True, {"next": next_url})

    return view


register = make_auth_view(RegistrationSerializer)
login = make_auth_view(LoginSerializer)
social_auth = make_auth_view(SocialAuthSerializer)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    if request.user.is_anonymous:
        return make_response(True)

    blacklist_user_tokens(request.user)
    logout_user(request)
    return make_response(True)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    password = request.data.get("password")
    new_password = request.data.get("new_password")

    if not user.check_password(password):
        return make_response(False, {"error": AUTH_FAILURE})

    return check_and_change_password(request, user, new_password)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_email(request):
    user = request.user
    password = request.data.get("password")
    new_email = request.data.get("new_email")

    if not user.check_password(password):
        return make_response(False, {"error": AUTH_FAILURE})

    # TODO get a confirmation email going with a link that will
    # verify the email address.
    serializer = ChangeEmailSerializer(instance=user, data={"email": new_email})

    if not serializer.is_valid():
        return make_response(False)

    return make_response(True)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_email(drf_request):
    user = drf_request.user
    password = drf_request.data.get("password")
    new_email = drf_request.data.get("new_email")

    if not user.check_password(password):
        return make_response(False, {"error": AUTH_FAILURE})

    # TODO get a confirmation email going with a link that will
    # verify the email address.
    serializer = ChangeEmailSerializer(instance=user, data={"email": new_email})

    if not serializer.is_valid():
        return make_response(False)

    return make_response(True)


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
def reset_password(request):
    uid = request.data.get("portunus_uuid")
    token = request.data.get("token")
    new_password = request.data.get("new_password")

    try:
        user = User.objects.get(portunus_uuid=uid)
    except User.DoesNotExist:
        return make_response(False, {"error": AUTH_FAILURE})
    except ValidationError:
        return make_response(False)

    if not check_onetime_token(token, user):
        return make_response(False, {"error": INVALID_TOKEN})

    return check_and_change_password(request, user, new_password)


class TokenRefreshView(SimpleJWTTokenRefreshView):
    """
    Pulls the refresh type JSON web token from the user session and returns an
    access type JSON web token if the refresh token is valid.
    """

    def get_serializer(self, *args, **kwargs):
        kwargs["data"] = dict(kwargs["data"])
        kwargs["data"]["refresh"] = self.request.session.get(REFRESH_TOKEN_SESSION_KEY)
        return super().get_serializer(*args, **kwargs)
