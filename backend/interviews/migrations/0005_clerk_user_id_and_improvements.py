from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('interviews', '0004_add_resume_text'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='interview',
            name='clerk_user_id',
            field=models.CharField(blank=True, db_index=True, default='', max_length=200),
        ),
        migrations.AddField(
            model_name='interview',
            name='overall_score',
            field=models.IntegerField(default=0, help_text='Average score across all answers'),
        ),
        migrations.AlterField(
            model_name='interview',
            name='user',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='interviews',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name='interview',
            name='skills',
            field=models.TextField(blank=True, default='', help_text='Comma-separated skills'),
        ),
        migrations.AlterField(
            model_name='interview',
            name='job_title',
            field=models.CharField(max_length=200),
        ),
        migrations.AlterField(
            model_name='question',
            name='question_type',
            field=models.CharField(
                choices=[('basic', 'Basic'), ('technical', 'Technical'), ('behavioral', 'Behavioral'), ('situational', 'Situational')],
                default='technical',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='answer',
            name='score',
            field=models.IntegerField(default=0, help_text='Score out of 10'),
        ),
        migrations.AlterModelOptions(
            name='interview',
            options={'ordering': ['-created_at']},
        ),
    ]
