from django.urls import path
from rest_framework_simplejwt.views import TokenVerifyView

from . import views

app_name = "authentication"

urlpatterns = [
    path("register/", views.register, name="register"),
    path("login/", views.login, name="login"),
    path("users/settings/", views.get_current_user_settings, name="get_current_user"),
    path("users/", views.CreateUserView.as_view(), name="create_user"),
    path(
        "users/<str:portunus_uuid>/",
        views.RetrieveDeleteUserView.as_view(),
        name="retrieve_or_delete_user",
    ),
    path("token/refresh/", views.TokenRefreshView.as_view(), name="token_refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("change-password/", views.change_password, name="change_password"),
    path("password-reset/", views.request_password_reset, name="password_reset"),
    path(
        "admin-password-reset/",
        views.admin_request_password_reset,
        name="admin_password_reset",
    ),
    path("password-reset/complete/", views.reset_password, name="password_reset_complete"),
    path("change-email/", views.request_email_change, name="change_email"),
    path("change-email/complete/", views.update_email, name="update_email"),
    path("send-new-user-email", views.send_new_user_email, name="send_new_user_email"),
]
