from rest_framework import serializers
from .models import Interview, InterviewShareLink, Question, Answer
import logging

logger = logging.getLogger(__name__)


class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ['id', 'answer_text', 'feedback', 'score', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class QuestionSerializer(serializers.ModelSerializer):
    answer = AnswerSerializer(read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'question_text', 'question_type', 'order', 'answer', 'created_at']
        read_only_fields = ['id', 'created_at']


class InterviewSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    skills_list = serializers.SerializerMethodField()
    total_questions = serializers.SerializerMethodField()
    answered_questions = serializers.SerializerMethodField()

    class Meta:
        model = Interview
        fields = [
            'id', 'clerk_user_id', 'job_title', 'job_description', 'skills', 'skills_list',
            'difficulty', 'status', 'overall_score', 'questions', 'total_questions',
            'answered_questions', 'ai_review', 'ai_final_score', 'ai_review_generated_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_skills_list(self, obj):
        if obj.skills:
            return [skill.strip() for skill in obj.skills.split(',') if skill.strip()]
        return []

    def get_total_questions(self, obj):
        return obj.questions.count()

    def get_answered_questions(self, obj):
        return Answer.objects.filter(question__interview=obj).count()


class InterviewListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views (no nested questions)."""
    skills_list = serializers.SerializerMethodField()
    total_questions = serializers.SerializerMethodField()
    answered_questions = serializers.SerializerMethodField()

    class Meta:
        model = Interview
        fields = [
            'id', 'clerk_user_id', 'job_title', 'skills', 'skills_list',
            'difficulty', 'status', 'overall_score', 'total_questions',
            'answered_questions', 'ai_review', 'ai_final_score', 'ai_review_generated_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_skills_list(self, obj):
        if obj.skills:
            return [skill.strip() for skill in obj.skills.split(',') if skill.strip()]
        return []

    def get_total_questions(self, obj):
        return obj.questions.count()

    def get_answered_questions(self, obj):
        return Answer.objects.filter(question__interview=obj).count()


class CreateInterviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interview
        fields = ['id', 'job_title', 'job_description', 'skills', 'difficulty', 'resume_text', 'clerk_user_id']
        extra_kwargs = {
            'job_title': {'required': False, 'allow_blank': True},
            'job_description': {'required': False, 'allow_blank': True},
            'skills': {'required': False, 'allow_blank': True},
            'clerk_user_id': {'required': False, 'allow_blank': True},
        }

    def create(self, validated_data):
        if not validated_data.get('job_title'):
            validated_data['job_title'] = 'Interview Session'
        interview = Interview.objects.create(**validated_data)
        logger.info(f"Interview created with ID: {interview.id}")
        return interview


class InterviewShareLinkSerializer(serializers.ModelSerializer):
    is_expired = serializers.SerializerMethodField()
    attempts_total = serializers.SerializerMethodField()
    attempts_completed = serializers.SerializerMethodField()
    attempts_pending = serializers.SerializerMethodField()

    class Meta:
        model = InterviewShareLink
        fields = [
            'id', 'token',
            'created_by_clerk_user_id', 'created_by_email',
            'role', 'job_description', 'experience', 'difficulty',
            'expires_at', 'is_active', 'is_expired',
            'attempts_total', 'attempts_completed', 'attempts_pending',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'token', 'created_at', 'updated_at', 'is_expired']

    def get_is_expired(self, obj):
        return bool(getattr(obj, 'is_expired', False))

    def get_attempts_total(self, obj):
        return getattr(obj, 'interview_attempts', None).count() if hasattr(obj, 'interview_attempts') else 0

    def get_attempts_completed(self, obj):
        if not hasattr(obj, 'interview_attempts'):
            return 0
        return obj.interview_attempts.filter(status='completed').count()

    def get_attempts_pending(self, obj):
        if not hasattr(obj, 'interview_attempts'):
            return 0
        return obj.interview_attempts.exclude(status='completed').count()


class InterviewAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interview
        fields = [
            'id', 'clerk_user_id',
            'job_title', 'difficulty', 'status',
            'overall_score', 'ai_final_score', 'ai_review_generated_at',
            'created_at',
        ]
        read_only_fields = fields


class CreateInterviewShareLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewShareLink
        fields = [
            'id', 'token',
            'created_by_clerk_user_id', 'created_by_email',
            'role', 'job_description', 'experience', 'difficulty',
            'expires_at', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'token', 'created_at', 'updated_at']

