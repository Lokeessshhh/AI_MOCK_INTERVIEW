from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('interviews', '0005_clerk_user_id_and_improvements'),
    ]

    operations = [
        migrations.AddField(
            model_name='interview',
            name='ai_review',
            field=models.JSONField(blank=True, help_text='AI-generated full interview review payload', null=True),
        ),
        migrations.AddField(
            model_name='interview',
            name='ai_final_score',
            field=models.FloatField(default=0, help_text='Final AI score for the interview'),
        ),
        migrations.AddField(
            model_name='interview',
            name='ai_review_generated_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
