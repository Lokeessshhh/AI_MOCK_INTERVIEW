from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InterviewViewSet, QuestionViewSet, AnswerViewSet, ShareLinkViewSet, parse_resume

router = DefaultRouter()
router.register(r'interviews', InterviewViewSet, basename='interview')
router.register(r'share-links', ShareLinkViewSet, basename='share-link')
router.register(r'questions', QuestionViewSet, basename='question')
router.register(r'answers', AnswerViewSet, basename='answer')

urlpatterns = [
    path('parse-resume/', parse_resume, name='parse-resume'),
    path('', include(router.urls)),
]
