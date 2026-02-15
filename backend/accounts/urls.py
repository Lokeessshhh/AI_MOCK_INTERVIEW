from django.urls import path
from .views import register, login, ProfileView

urlpatterns = [
    path('register/', register, name='register'),
    path('login/', login, name='login'),
    path('profile/', ProfileView.as_view(), name='profile'),
]
