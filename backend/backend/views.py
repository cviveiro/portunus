from django.http import HttpResponse
from django.views.decorators.http import require_GET
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_200_OK


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def is_authenticated(request):
    content = {"email": request.user.email}
    return Response(content)


@ensure_csrf_cookie
@require_GET
def set_csrf(request):
    return HttpResponse("success", status=HTTP_200_OK)
