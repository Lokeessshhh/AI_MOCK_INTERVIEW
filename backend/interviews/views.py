import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.conf import settings
from django.db import models
from django.utils import timezone
import os
import threading
from .models import Interview, Question, Answer
from .serializers import (
    InterviewSerializer, InterviewListSerializer, QuestionSerializer,
    AnswerSerializer, CreateInterviewSerializer,
    InterviewShareLinkSerializer, CreateInterviewShareLinkSerializer,
    InterviewAttemptSerializer,
)
from .services import AIQuestionGenerator
from .resume_parser import ResumeParser

logger = logging.getLogger(__name__)


def generate_questions_async(interview, resume_file_path=None):
    """Generate questions in a background thread."""
    try:
        logger.info(f"Starting AI question generation for interview {interview.id}")
        generator = AIQuestionGenerator()
        questions = generator.generate_questions(interview, resume_file_path)
        interview.status = 'in_progress'
        interview.save()
        logger.info(f"Generated {len(questions)} questions for interview {interview.id}")
    except Exception as e:
        logger.error(f"Error generating questions for interview {interview.id}: {e}")
        interview.status = 'pending'
        interview.save()


def evaluate_interview_async(interview_id: int):
    """Evaluate an interview in a background thread and store the AI review."""
    try:
        interview = Interview.objects.get(id=interview_id)
    except Interview.DoesNotExist:
        return

    try:
        logger.info(f"Starting full interview evaluation for interview {interview.id}")
        generator = AIQuestionGenerator()
        review = generator.evaluate_full_interview(interview)

        interview.ai_review = review
        try:
            interview.ai_final_score = float((review or {}).get('final', {}).get('final_score', 0) or 0)
        except (TypeError, ValueError):
            interview.ai_final_score = 0
        interview.ai_review_generated_at = timezone.now()
        interview.save(update_fields=['ai_review', 'ai_final_score', 'ai_review_generated_at', 'updated_at'])
        logger.info(f"Full interview evaluation stored for interview {interview.id}")
    except Exception as e:
        logger.error(f"Error evaluating interview {interview.id}: {e}")
        interview.ai_review = {
            'error': True,
            'message': str(e),
        }
        interview.ai_final_score = 0
        interview.ai_review_generated_at = timezone.now()
        interview.save(update_fields=['ai_review', 'ai_final_score', 'ai_review_generated_at', 'updated_at'])


class InterviewViewSet(viewsets.ModelViewSet):
    queryset = Interview.objects.all()
    serializer_class = InterviewSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateInterviewSerializer
        if self.action == 'list':
            return InterviewListSerializer
        return InterviewSerializer

    def get_queryset(self):
        qs = Interview.objects.all()
        clerk_user_id = self.request.query_params.get('clerk_user_id')
        if clerk_user_id:
            qs = qs.filter(clerk_user_id=clerk_user_id)
        return qs

    def perform_create(self, serializer):
        interview = serializer.save()
        logger.info(f"Interview {interview.id} created: {interview.job_title}")

        # Handle resume file if uploaded
        resume_file = self.request.FILES.get('resume')
        resume_file_path = None

        if resume_file:
            upload_dir = os.path.join(settings.MEDIA_ROOT, 'resumes')
            os.makedirs(upload_dir, exist_ok=True)
            resume_filename = f"resume_{interview.id}_{resume_file.name}"
            resume_file_path = os.path.join(upload_dir, resume_filename)
            with open(resume_file_path, 'wb+') as destination:
                for chunk in resume_file.chunks():
                    destination.write(chunk)

        # Generate questions in background
        thread = threading.Thread(target=generate_questions_async, args=(interview, resume_file_path))
        thread.daemon = True
        thread.start()

    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        interview = self.get_object()
        questions = interview.questions.all().order_by('order')
        serializer = QuestionSerializer(questions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def next_question(self, request, pk=None):
        """Return the next unanswered question (one question at a time)."""
        interview = self.get_object()

        questions = interview.questions.all().order_by('order')
        for q in questions:
            ans = getattr(q, 'answer', None)
            if not ans or not getattr(ans, 'answer_text', '').strip():
                serializer = QuestionSerializer(q)
                return Response({'done': False, 'question': serializer.data}, status=status.HTTP_200_OK)

        return Response({'done': True, 'question': None}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def submit_answer(self, request, pk=None):
        interview = self.get_object()
        question_id = request.data.get('question_id')
        answer_text = request.data.get('answer', '')

        try:
            question = Question.objects.get(id=question_id, interview=interview)
        except Question.DoesNotExist:
            return Response({'error': 'Question not found'}, status=status.HTTP_404_NOT_FOUND)

        answer, _created = Answer.objects.update_or_create(
            question=question,
            defaults={'answer_text': answer_text},
        )
        serializer = AnswerSerializer(answer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def evaluate_answer(self, request, pk=None):
        interview = self.get_object()
        question_text = request.data.get('question_text')
        answer_text = request.data.get('answer')
        followup_count = request.data.get('followup_count', 0)

        if not question_text:
            return Response({'error': 'question_text is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Skip AI evaluation for non-user answers
        if not (str(answer_text or '').strip()):
            return Response({
                'skipped': True,
                'reason': 'no_user_answer',
                'decision': 'next',
                'score': None,
                'is_good': False,
                'followup_question': None,
            }, status=status.HTTP_200_OK)

        try:
            followup_count_int = int(followup_count)
        except (TypeError, ValueError):
            followup_count_int = 0

        generator = AIQuestionGenerator()
        result = generator.evaluate_answer(
            interview=interview,
            question_text=str(question_text),
            answer_text=str(answer_text or ''),
            followup_count=followup_count_int,
        )
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        interview = self.get_object()
        interview.status = 'completed'

        # Calculate overall score
        total_questions = interview.questions.count()
        total_score = Answer.objects.filter(
            question__interview=interview
        ).aggregate(total_score=models.Sum('score'))
        total_score_value = total_score.get('total_score') or 0
        if total_questions > 0:
            interview.overall_score = int(total_score_value / total_questions)
        else:
            interview.overall_score = 0
        interview.save()

        # Kick off AI review asynchronously
        thread = threading.Thread(target=evaluate_interview_async, args=(interview.id,))
        thread.daemon = True
        thread.start()

        serializer = InterviewSerializer(interview)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def evaluate_interview(self, request, pk=None):
        """Trigger (or re-trigger) AI full interview evaluation."""
        interview = self.get_object()

        force = request.data.get('force', False)
        if not force and interview.ai_review is not None:
            return Response({
                'status': 'already_generated',
                'ai_final_score': interview.ai_final_score,
                'ai_review_generated_at': interview.ai_review_generated_at,
            }, status=status.HTTP_200_OK)

        # If forcing re-generation, clear existing review first so clients can poll for fresh data
        if force:
            interview.ai_review = None
            interview.ai_final_score = 0
            interview.ai_review_generated_at = None
            interview.save(update_fields=['ai_review', 'ai_final_score', 'ai_review_generated_at', 'updated_at'])

        thread = threading.Thread(target=evaluate_interview_async, args=(interview.id,))
        thread.daemon = True
        thread.start()
        return Response({'status': 'started'}, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=['post'])
    def reattempt(self, request, pk=None):
        """Reset an interview to reattempt with the same questions."""
        interview = self.get_object()

        # Delete answers (OneToOne per question)
        Answer.objects.filter(question__interview=interview).delete()

        interview.status = 'in_progress'
        interview.overall_score = 0
        interview.ai_review = None
        interview.ai_final_score = 0
        interview.ai_review_generated_at = None
        interview.save(update_fields=['status', 'overall_score', 'ai_review', 'ai_final_score', 'ai_review_generated_at', 'updated_at'])

        serializer = InterviewSerializer(interview)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        """Return detailed results for a completed interview."""
        interview = self.get_object()
        questions = interview.questions.all().order_by('order')
        question_data = QuestionSerializer(questions, many=True).data

        # Merge AI review data into questions if available
        if interview.ai_review and isinstance(interview.ai_review, dict):
            per_question_map = {}
            for item in interview.ai_review.get('per_question', []):
                order = item.get('order')
                if order is not None:
                    per_question_map[order] = item

            for q in question_data:
                order = q.get('order')
                if order in per_question_map:
                    review_item = per_question_map[order]
                    q['ai_answer'] = review_item.get('ai_answer', '')
                    q['strategy_to_improve'] = review_item.get('strategy_to_improve', '')
                    q['improvements_needed'] = review_item.get('improvements_needed', [])
                    q['ai_score'] = review_item.get('score', None)

        total_answered = Answer.objects.filter(question__interview=interview).count()
        total_questions = questions.count()
        total_score = Answer.objects.filter(
            question__interview=interview
        ).aggregate(total_score=models.Sum('score'))
        total_score_value = total_score.get('total_score') or 0
        average_score = (total_score_value / total_questions) if total_questions > 0 else 0

        return Response({
            'interview': {
                'id': interview.id,
                'job_title': interview.job_title,
                'difficulty': interview.difficulty,
                'status': interview.status,
                'overall_score': interview.overall_score,
                'ai_final_score': interview.ai_final_score,
                'ai_review_generated_at': interview.ai_review_generated_at,
                'ai_review': {
                    'status': interview.ai_review.get('status') if isinstance(interview.ai_review, dict) else None,
                    'current_step': interview.ai_review.get('current_step') if isinstance(interview.ai_review, dict) else None,
                    'per_question': interview.ai_review.get('per_question', []) if isinstance(interview.ai_review, dict) else [],
                    'final': interview.ai_review.get('final') if isinstance(interview.ai_review, dict) else None,
                    'error': interview.ai_review.get('error') if isinstance(interview.ai_review, dict) else None,
                } if interview.ai_review else None,
                'created_at': interview.created_at,
            },
            'questions': question_data,
            'summary': {
                'total_questions': questions.count(),
                'total_answered': total_answered,
                'average_score': average_score,
            },
        })


class ShareLinkViewSet(viewsets.ModelViewSet):
    """CRUD for interviewer-created public share links."""

    queryset = Interview.objects.none()

    def get_queryset(self):
        from .models import InterviewShareLink

        qs = InterviewShareLink.objects.all()
        clerk_user_id = self.request.query_params.get('clerk_user_id')
        created_by_email = self.request.query_params.get('created_by_email')
        if clerk_user_id:
            qs = qs.filter(created_by_clerk_user_id=clerk_user_id)
        if created_by_email:
            qs = qs.filter(created_by_email=created_by_email)
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateInterviewShareLinkSerializer
        return InterviewShareLinkSerializer

    def destroy(self, request, *args, **kwargs):
        """Interviewer: delete a share link.

        Minimal auth: requires `clerk_user_id` query param and matches the link creator.
        """
        link = self.get_object()
        clerk_user_id = (request.query_params or {}).get('clerk_user_id') or ''
        if not str(clerk_user_id).strip() or str(clerk_user_id) != str(link.created_by_clerk_user_id or ''):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def regenerate(self, request, pk=None):
        """Interviewer: regenerate token for a share link (new URL).

        Requires `clerk_user_id` in request body to match link creator.
        """
        link = self.get_object()
        clerk_user_id = (request.data or {}).get('clerk_user_id') or ''
        if not str(clerk_user_id).strip() or str(clerk_user_id) != str(link.created_by_clerk_user_id or ''):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        # UUIDField default does not auto-update on save; set explicitly.
        import uuid
        link.token = uuid.uuid4()
        link.save(update_fields=['token', 'updated_at'])

        return Response(InterviewShareLinkSerializer(link).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path=r'public/(?P<token>[^/]+)')
    def public(self, request, token=None):
        """Public: fetch share link config by token (enforces active + expiry)."""
        from .models import InterviewShareLink

        try:
            link = InterviewShareLink.objects.get(token=token)
        except InterviewShareLink.DoesNotExist:
            return Response({'error': 'Link not found'}, status=status.HTTP_404_NOT_FOUND)

        if not link.is_active:
            return Response({'error': 'Link disabled'}, status=status.HTTP_410_GONE)
        if link.is_expired:
            return Response({'error': 'Link expired'}, status=status.HTTP_410_GONE)

        return Response(InterviewShareLinkSerializer(link).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path=r'public/(?P<token>[^/]+)/start')
    def start_from_link(self, request, token=None):
        """Public: start an interview attempt from a share link token.

        Creates a new Interview record (one attempt per student). Optionally accepts
        `clerk_user_id` if the student is signed in.
        """
        from .models import InterviewShareLink

        try:
            link = InterviewShareLink.objects.get(token=token)
        except InterviewShareLink.DoesNotExist:
            return Response({'error': 'Link not found'}, status=status.HTTP_404_NOT_FOUND)

        if not link.is_active:
            return Response({'error': 'Link disabled'}, status=status.HTTP_410_GONE)
        if link.is_expired:
            return Response({'error': 'Link expired'}, status=status.HTTP_410_GONE)

        clerk_user_id = (request.data or {}).get('clerk_user_id') or ''
        if not str(clerk_user_id).strip():
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        interview = Interview.objects.create(
            clerk_user_id=str(clerk_user_id),
            share_link=link,
            job_title=link.role,
            job_description=link.job_description,
            difficulty=link.difficulty,
        )

        thread = threading.Thread(target=generate_questions_async, args=(interview, None))
        thread.daemon = True
        thread.start()

        return Response({'interview_id': interview.id}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def attempts(self, request, pk=None):
        """Interviewer: list attempts for a given share link."""
        link = self.get_object()
        attempts = link.interview_attempts.all().order_by('-created_at')
        return Response(InterviewAttemptSerializer(attempts, many=True).data, status=status.HTTP_200_OK)


class QuestionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Question.objects.all()
    serializer_class = QuestionSerializer

    def get_queryset(self):
        interview_id = self.request.query_params.get('interview_id')
        if interview_id:
            return self.queryset.filter(interview_id=interview_id).order_by('order')
        return self.queryset


class AnswerViewSet(viewsets.ModelViewSet):
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer

    def get_queryset(self):
        question_id = self.request.query_params.get('question_id')
        if question_id:
            return self.queryset.filter(question_id=question_id)
        return self.queryset


@api_view(['POST'])
def parse_resume(request):
    """Parse resume and return full text."""
    resume_file = request.FILES.get('resume')

    if not resume_file:
        return Response({'error': 'No resume file provided'}, status=status.HTTP_400_BAD_REQUEST)

    upload_dir = os.path.join(settings.MEDIA_ROOT, 'temp_resumes')
    os.makedirs(upload_dir, exist_ok=True)

    temp_path = os.path.join(upload_dir, f"temp_{resume_file.name}")

    with open(temp_path, 'wb+') as destination:
        for chunk in resume_file.chunks():
            destination.write(chunk)

    parser = ResumeParser()
    resume_text = parser._extract_text(temp_path)

    # Clean up
    try:
        os.remove(temp_path)
    except OSError:
        pass

    return Response({
        'success': True,
        'text': resume_text or '',
    })
