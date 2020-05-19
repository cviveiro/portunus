import json

from django.views.decorators.http import require_POST
from django.core.exceptions import ValidationError
from rest_framework.generics import CreateAPIView, RetrieveDestroyAPIView
from rest_framework_simplejwt.views import TokenRefreshView as SimpleJWTTokenRefreshView
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import permission_classes, api_view
from django.core.validators import validate_email

from authentication.utils import blacklist_user_tokens

from .serializers import (
    RegistrationSerializer,
    LoginSerializer,
    UserSerializer,
    CreateUserSerializer,
)
from .models import User
from .utils import (
    login_user,
    REFRESH_TOKEN_SESSION_KEY,
    check_and_change_password,
    check_onetime_token,
    check_change_email_token,
    make_response,
    get_valid_redirect_url,
    check_password_for_auth_change,
)
from .errors import AUTH_FAILURE, INVALID_TOKEN, INVALID_EMAIL, EMAIL_EXISTS
from shared.email import PortunusMailer
from shared.permissions import IsSameUserOrAdmin


def make_auth_view(serializer_class):
    @require_POST
    def view(request):
        data = json.loads(request.body)
        serializer = serializer_class(data=data, context={"request": request})

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


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    password = request.data.get("password")
    new_password = request.data.get("new_password")

    response = check_password_for_auth_change(request, user, password)
    if response is not None:
        return response

    return check_and_change_password(request, user, new_password)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def request_email_change(request):
    user = request.user
    password = request.data.get("password")
    new_email = request.data.get("new_email")

    response = check_password_for_auth_change(request, user, password)
    if response is not None:
        return response

    try:
        validate_email(new_email)
        existing_user = User.objects.filter(email=request.data["new_email"]).first()
        if existing_user:
            return make_response(False, {"error": EMAIL_EXISTS})
    except ValidationError:
        return make_response(False, {"error": INVALID_EMAIL})

    PortunusMailer.send_change_email_confirmation(user, new_email)
    return make_response()


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_email(request):
    user = request.user
    token = request.data.get("token")
    new_email = request.data.get("newEmail")

    if not check_change_email_token(token, user):
        return make_response(False, {"error": INVALID_TOKEN})

    serializer = UserSerializer(instance=user, data={"email": new_email})

    if not serializer.is_valid():
        return make_response(False, {"error": INVALID_EMAIL})
    serializer.save()

    return make_response()


@api_view(["POST"])
def request_password_reset(request):
    email = request.data.get("email")
    if not email:
        return make_response(False)

    try:
        user = User.objects.get(email=email.lower())
    except User.DoesNotExist:
        # Send back success even if the account DNE to avoid leaking user emails.
        return make_response()

    PortunusMailer.send_password_reset(user)
    return make_response()


@api_view(["POST"])
@permission_classes([IsAdminUser])
def admin_request_password_reset(request):
    portunus_uuid = request.data.get("portunus_uuid")
    if not portunus_uuid:
        return make_response(False)

    try:
        user = User.objects.get(portunus_uuid=portunus_uuid)
    except User.DoesNotExist:
        return make_response(False)

    PortunusMailer.send_password_reset(user)
    return make_response()


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


class CreateUserView(CreateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = CreateUserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)

        if serializer.is_valid():
            user = serializer.create(request.data)
            return make_response(True, {"portunus_uuid": str(user.portunus_uuid)})
        else:
            existing_user = User.objects.filter(email=request.data["email"]).first()
            data = serializer.errors

            if existing_user:
                data["portunus_uuid"] = str(existing_user.portunus_uuid)
                data["user_exists"] = True
            return make_response(False, data)


class RetrieveDeleteUserView(RetrieveDestroyAPIView):
    permission_classes = [IsSameUserOrAdmin]
    serializer_class = UserSerializer
    lookup_field = "portunus_uuid"
    queryset = User.objects.all()

    def delete(self, request, *args, **kwargs):
        user = self.get_object()
        blacklist_user_tokens(user)
        return self.destroy(request, *args, **kwargs)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_current_user_settings(request):
    # TODO add social auth settings and link in the frontend.
    # TODO use a serializer for this when adding new fields.
    return make_response(data={"email": request.user.email})


@api_view(["POST"])
def send_new_user_email(request):
    uuid = request.data.get("portunus_uuid")
    if not uuid:
        return make_response(False)

    try:
        user = User.objects.get(portunus_uuid=uuid)
    except User.DoesNotExist:
        # Send back success even if the account DNE to avoid leaking uuids.
        return make_response()

    PortunusMailer.send_account_creation_notice(user)
    return make_response()
