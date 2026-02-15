from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid


class Interview(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]

    clerk_user_id = models.CharField(max_length=200, blank=True, default='', db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='interviews',
    )
    share_link = models.ForeignKey(
        'InterviewShareLink', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='interview_attempts',
    )
    job_title = models.CharField(max_length=200)
    job_description = models.TextField(blank=True)
    skills = models.TextField(help_text='Comma-separated skills', blank=True, default='')
    difficulty = models.CharField(
        max_length=20,
        choices=[('beginner', 'Beginner'), ('intermediate', 'Intermediate'), ('advanced', 'Advanced')],
        default='intermediate',
    )
    resume_text = models.TextField(blank=True, help_text='Full resume text for AI question generation')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    overall_score = models.IntegerField(default=0, help_text='Average score across all answers')
    ai_review = models.JSONField(null=True, blank=True, help_text='AI-generated full interview review payload')
    ai_final_score = models.FloatField(default=0, help_text='Final AI score for the interview')
    ai_review_generated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.clerk_user_id} - {self.job_title}"


class InterviewShareLink(models.Model):
    """Public share link for an interview template created by an interviewer.

    Anyone with the token can start an interview attempt. Link can expire.
    """

    token = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True, editable=False)

    created_by_clerk_user_id = models.CharField(max_length=200, blank=True, default='', db_index=True)
    created_by_email = models.EmailField(blank=True, default='')

    role = models.CharField(max_length=200)
    job_description = models.TextField(blank=True, default='')
    experience = models.CharField(max_length=200, blank=True, default='')
    difficulty = models.CharField(
        max_length=20,
        choices=[('beginner', 'Beginner'), ('intermediate', 'Intermediate'), ('advanced', 'Advanced')],
        default='intermediate',
    )

    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"ShareLink {self.token} ({self.role})"

    @property
    def is_expired(self) -> bool:
        if not self.expires_at:
            return False
        return timezone.now() >= self.expires_at


class Question(models.Model):
    QUESTION_TYPES = [
        ('basic', 'Basic'),
        ('technical', 'Technical'),
        ('behavioral', 'Behavioral'),
        ('situational', 'Situational'),
    ]

    interview = models.ForeignKey(Interview, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES, default='technical')
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Q{self.order}: {self.question_text[:50]}..."


class Answer(models.Model):
    question = models.OneToOneField(Question, on_delete=models.CASCADE, related_name='answer')
    answer_text = models.TextField()
    audio_url = models.URLField(blank=True)
    feedback = models.TextField(blank=True)
    score = models.IntegerField(default=0, help_text='Score out of 10')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Answer to Q{self.question.order}"
