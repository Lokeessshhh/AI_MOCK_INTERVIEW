import os
import logging
import json
import requests
from datetime import datetime
import re
import ast
import concurrent.futures
from .models import Question
from .resume_parser import ResumeParser

logger = logging.getLogger(__name__)


class AIQuestionGenerator:
    def __init__(self):
        self.api_url = os.getenv('AI_API_URL', 'https://llama-8b.lokeshhlohar80.workers.dev')
        self.api_path = os.getenv('AI_API_PATH', '/chat')
        if not self.api_path.startswith('/'):
            self.api_path = f'/{self.api_path}'
        self.chat_endpoint = f'{self.api_url}{self.api_path}'
        self.resume_parser = ResumeParser()
        logger.info(f"AIQuestionGenerator initialized with API URL: {self.chat_endpoint}")

    def _extract_json_array_text(self, text: str) -> str | None:
        if not text:
            return None

        s = text.strip()

        # If it is already a JSON array.
        if s.startswith('[') and s.endswith(']'):
            return s

        # Try to find the outermost JSON array.
        start_idx = s.find('[')
        if start_idx == -1:
            return None

        end_idx = s.rfind(']')
        if end_idx != -1 and end_idx > start_idx:
            return s[start_idx : end_idx + 1]

        # Sometimes the worker truncates before the final closing bracket.
        # We attempt to close the array at the last complete object boundary.
        last_obj_end = s.rfind('}')
        if last_obj_end == -1 or last_obj_end <= start_idx:
            return None

        candidate = s[start_idx : last_obj_end + 1] + ']'
        return candidate

    def _extract_json_object_text(self, text: str) -> str | None:
        if not text:
            return None

        s = text.strip()
        start_idx = s.find('{')
        if start_idx == -1:
            return None

        end_idx = s.rfind('}')
        if end_idx != -1 and end_idx > start_idx:
            return s[start_idx : end_idx + 1]

        # Truncated: take from first '{' and try to repair later.
        return s[start_idx:]

    def _repair_json_object_text(self, text: str) -> str:
        if not text:
            return ""

        cleaned = text.strip()

        # Remove any markdown code block indicators
        cleaned = re.sub(r"^```(json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned.strip())

        # Remove trailing commas before closing braces/brackets
        cleaned = re.sub(r",\s*([}\]])", r"\1", cleaned)

        # If it's truncated, close braces
        open_braces = cleaned.count('{')
        close_braces = cleaned.count('}')
        if open_braces > close_braces:
            cleaned += '}' * (open_braces - close_braces)

        return cleaned.strip()

    def _loads_relaxed_object(self, raw_text: str):
        extracted = self._extract_json_object_text(raw_text)
        if not extracted:
            raise ValueError('No JSON object found in text')

        repaired = self._repair_json_object_text(extracted)
        try:
            return json.loads(repaired)
        except json.JSONDecodeError:
            # Some models return Python dict-like strings (single quotes, True/False/None)
            try:
                py_obj = ast.literal_eval(repaired)
            except Exception:
                py_obj = ast.literal_eval(extracted)
            if not isinstance(py_obj, dict):
                raise ValueError('Parsed object is not a dict')
            return py_obj

    def _repair_json_array_text(self, text: str) -> str:
        s = text.strip()

        # Remove trailing commas before a closing bracket
        s = re.sub(r',\s*\]', ']', s)

        # If it ends with an object but missing the closing array bracket
        if s.startswith('[') and not s.endswith(']'):
            last_obj_end = s.rfind('}')
            if last_obj_end != -1:
                s = s[: last_obj_end + 1] + ']'

        return s

    def generate_questions(self, interview, resume_file_path=None):
        logger.info("=" * 80)
        logger.info("Starting AI question generation")
        logger.info("=" * 80)
        
        logger.info(f"Interview ID: {interview.id}")
        logger.info(f"Job Title: {interview.job_title}")
        logger.info(f"Skills: {interview.skills}")
        logger.info(f"Difficulty: {interview.difficulty}")
        logger.info(f"Job Description: {interview.job_description[:100] if interview.job_description else 'None'}...")
        
        # Check if resume text is provided
        resume_text = getattr(interview, 'resume_text', None)
        
        # Build prompt with or without resume text
        if resume_text:
            prompt = self._build_prompt_with_resume_text(interview, resume_text)
        else:
            prompt = self._build_prompt_without_resume(interview)
        
        payload = {
            "messages": [
                {
                    "role": "system",
                    "content": "You are a JSON response generator. You MUST return ONLY valid JSON arrays. No other text, no explanations, no markdown formatting. Just pure JSON arrays with interview questions."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        }

        logger.info(f"Calling AI endpoint: {self.chat_endpoint}")
        logger.info(f"Payload size: {len(json.dumps(payload))} bytes")
        
        try:
            logger.info("Sending request to AI endpoint...")
            response = requests.post(self.chat_endpoint, json=payload, timeout=60)
            
            logger.info(f"Response status code: {response.status_code}")
            
            if response.status_code != 200:
                logger.error(f"AI endpoint returned error status: {response.status_code}")
                logger.error(f"Response body: {response.text}")
                raise Exception(f"AI endpoint error: {response.status_code}")
            
            logger.info("AI endpoint response received successfully")

            raw_text = response.text or ""
            logger.info(f"AI raw response length: {len(raw_text)} characters")
            logger.info(f"AI raw response preview: {raw_text[:500]}...")

            # Parse questions from response. The worker sometimes returns:
            # - a JSON array (string)
            # - a JSON object with nested 'response.response'
            # - extra surrounding text
            candidates: list[str] = []

            # 1) Try json() if possible; but never rely on it.
            try:
                response_data = response.json()
                if isinstance(response_data, list):
                    candidates.append(json.dumps(response_data))
                elif isinstance(response_data, dict) and 'response' in response_data:
                    nested = response_data.get('response')
                    if isinstance(nested, dict) and 'response' in nested:
                        candidates.append(str(nested.get('response') or ''))
                    else:
                        candidates.append(str(nested))
                else:
                    candidates.append(str(response_data))
            except Exception:
                # If JSON decoding fails, we parse as raw text.
                pass

            # 2) Always also try the raw response body.
            candidates.append(raw_text)

            last_error: Exception | None = None
            for cand in candidates:
                try:
                    extracted = self._extract_json_array_text(cand)
                    if not extracted:
                        continue

                    repaired = self._repair_json_array_text(extracted)
                    questions_data = json.loads(repaired)
                    if not isinstance(questions_data, list):
                        continue

                    questions: list[Question] = []
                    for idx, q_data in enumerate(questions_data):
                        if not (isinstance(q_data, dict) and q_data.get('question_text')):
                            logger.warning(f"Skipping invalid question data at index {idx}: {q_data}")
                            continue

                        question = Question.objects.create(
                            interview=interview,
                            question_text=str(q_data['question_text']),
                            question_type=str(q_data.get('question_type') or 'technical'),
                            order=len(questions) + 1,
                        )
                        questions.append(question)

                    if not questions:
                        last_error = Exception("Parsed JSON array but no valid questions were found")
                        continue

                    logger.info(f"Successfully created {len(questions)} questions")
                    logger.info("=" * 80)
                    logger.info("AI question generation completed successfully")
                    logger.info("=" * 80)
                    return questions
                except Exception as e:
                    last_error = e
                    continue

            raise Exception(f"Failed to parse AI response into questions. Last error: {last_error}")
                
        except requests.exceptions.Timeout:
            logger.error("Request to AI endpoint timed out")
            raise Exception("AI endpoint request timed out")
        except requests.exceptions.RequestException as e:
            logger.error(f"Request to AI endpoint failed: {e}")
            logger.error(f"Error type: {type(e).__name__}")
            raise Exception(f"AI endpoint request failed: {e}")
        except Exception as e:
            logger.error("=" * 80)
            logger.error("ERROR during AI question generation")
            logger.error("=" * 80)
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(f"Error message: {str(e)}")
            logger.error(f"Error details: {repr(e)}")
            import traceback
            logger.error(f"Traceback:\n{traceback.format_exc()}")
            logger.error("=" * 80)
            raise

    def _build_prompt_with_resume_text(self, interview, resume_text):
        """Build prompt with resume text for more targeted questions"""
        prompt = f"""Generate 15 interview questions for a {interview.job_title} position.

You MUST generate:
1) First 5 questions: basic/intro + project related + resume based + role requirements
2) Next 10 questions: main technical questions appropriate for the role and difficulty

Candidate's Resume:
{resume_text[:2000]}

Job Details:
Position: {interview.job_title}
Difficulty: {interview.difficulty}

Generate questions that test the candidate's knowledge and experience based on their resume. Focus on practical, scenario-based questions.

Return ONLY this exact JSON format (no other text):
[
  {{"question_text": "Basic/Intro Question 1", "question_type": "basic"}},
  {{"question_text": "Basic/Intro Question 2", "question_type": "basic"}},
  {{"question_text": "Basic/Intro Question 3", "question_type": "basic"}},
  {{"question_text": "Basic/Intro Question 4", "question_type": "basic"}},
  {{"question_text": "Basic/Intro Question 5", "question_type": "basic"}},
  {{"question_text": "Main Question 1", "question_type": "technical"}},
  {{"question_text": "Main Question 2", "question_type": "technical"}},
  {{"question_text": "Main Question 3", "question_type": "technical"}},
  {{"question_text": "Main Question 4", "question_type": "technical"}},
  {{"question_text": "Main Question 5", "question_type": "technical"}},
  {{"question_text": "Main Question 6", "question_type": "technical"}},
  {{"question_text": "Main Question 7", "question_type": "technical"}},
  {{"question_text": "Main Question 8", "question_type": "technical"}},
  {{"question_text": "Main Question 9", "question_type": "technical"}},
  {{"question_text": "Main Question 10", "question_type": "technical"}}
]"""
        return prompt

    def _build_prompt_without_resume(self, interview):
        """Build prompt without resume data"""
        prompt = f"""Generate 15 interview questions for a {interview.job_title} position.

You MUST generate:
1) First 5 questions: basic/intro + role expectations + simple fundamentals
2) Next 10 questions: main technical questions appropriate for the role and difficulty

Job Details:
Position: {interview.job_title}
Skills: {interview.skills}
Difficulty: {interview.difficulty}

Return ONLY this exact JSON format (no other text):
[
  {{"question_text": "Basic/Intro Question 1", "question_type": "basic"}},
  {{"question_text": "Basic/Intro Question 2", "question_type": "basic"}},
  {{"question_text": "Basic/Intro Question 3", "question_type": "basic"}},
  {{"question_text": "Basic/Intro Question 4", "question_type": "basic"}},
  {{"question_text": "Basic/Intro Question 5", "question_type": "basic"}},
  {{"question_text": "Main Question 1", "question_type": "technical"}},
  {{"question_text": "Main Question 2", "question_type": "technical"}},
  {{"question_text": "Main Question 3", "question_type": "technical"}},
  {{"question_text": "Main Question 4", "question_type": "technical"}},
  {{"question_text": "Main Question 5", "question_type": "technical"}},
  {{"question_text": "Main Question 6", "question_type": "technical"}},
  {{"question_text": "Main Question 7", "question_type": "technical"}},
  {{"question_text": "Main Question 8", "question_type": "technical"}},
  {{"question_text": "Main Question 9", "question_type": "technical"}},
  {{"question_text": "Main Question 10", "question_type": "technical"}}
]
"""
        return prompt

    def evaluate_answer(self, interview, question_text, answer_text, followup_count=0):
        """Evaluate answer quality and optionally propose a follow-up question.

        Returns dict:
            {"decision": "next"|"followup", "is_good": bool, "score": int, "followup_question": str|None}
        """
        resume_text = getattr(interview, 'resume_text', '') or ''

        prompt = f"""You are an interview evaluator.

Context:
- Role: {interview.job_title}
- Difficulty: {interview.difficulty}
- Skills: {getattr(interview, 'skills', '')}
- Candidate resume excerpt: {resume_text[:1200]}

Task:
Evaluate the candidate's answer to the interview question.

Rules:
- If the answer is sufficiently correct and complete for the difficulty, set decision = "next".
- If the answer is weak/incomplete, set decision = "followup" AND generate a single concise follow-up question targeting the missing details.
- The follow-up MUST be only about the same topic.
- followup_count indicates how many follow-ups have already been asked for this topic.
- If followup_count >= 2, decision MUST be "next" (no more follow-ups).

Question:
{question_text}

Answer:
{answer_text}

Return ONLY valid JSON object (no extra text):
{{
  "is_good": true,
  "score": 7,
  "decision": "next",
  "followup_question": null
}}
"""

        payload = {
            "messages": [
                {
                    "role": "system",
                    "content": "You are a JSON response generator. You MUST return ONLY valid JSON objects. No other text."
                },
                {"role": "user", "content": prompt}
            ]
        }

        logger.info(f"Evaluating answer via AI endpoint: {self.chat_endpoint}")

        response = requests.post(self.chat_endpoint, json=payload, timeout=60)
        if response.status_code != 200:
            logger.error(f"AI endpoint returned error status during evaluation: {response.status_code}")
            logger.error(f"Response body: {response.text}")
            raise Exception(f"AI endpoint error: {response.status_code}")

        raw_text = response.text or ""
        candidates: list[str] = []

        try:
            response_data = response.json()
            if isinstance(response_data, dict) and 'response' in response_data:
                nested = response_data.get('response')
                if isinstance(nested, dict) and 'response' in nested:
                    candidates.append(str(nested.get('response') or ''))
                else:
                    candidates.append(str(nested))
            else:
                candidates.append(str(response_data))
        except Exception:
            pass

        candidates.append(raw_text)

        data = None
        last_err: Exception | None = None
        for cand in candidates:
            try:
                data = self._loads_relaxed_object((cand or '').strip())
                break
            except Exception as e:
                last_err = e
                continue

        if not isinstance(data, dict):
            logger.error(f"Failed to parse AI evaluation response. Last error: {last_err}")
            data = {'is_good': False, 'score': 0, 'decision': 'next', 'followup_question': None}

        # Enforce followup max
        if followup_count >= 2:
            data['decision'] = 'next'
            data['followup_question'] = None

        if data.get('decision') == 'followup' and not data.get('followup_question'):
            data['decision'] = 'next'

        return {
            'is_good': bool(data.get('is_good', False)),
            'score': int(data.get('score', 0) or 0),
            'decision': data.get('decision', 'next'),
            'followup_question': data.get('followup_question')
        }

    def evaluate_full_interview(self, interview):
        """Evaluate all questions/answers in an interview and return structured JSON."""
        questions = interview.questions.all().order_by('order')
        total_questions_count = int(len(questions) or 0)

        def _extract_json_object(text: str) -> str | None:
            # Try to find the first '{' and the last '}'
            start = text.find('{')
            if start < 0:
                return None
            
            # If the JSON is truncated, it might not have a closing brace.
            # We'll try to find the last valid structure.
            end = text.rfind('}')
            if end > start:
                return text[start:end + 1]
            
            # If no closing brace, return from start to end of string and hope repair handles it
            return text[start:]

        def _try_local_repairs(text: str) -> str:
            if not text:
                return ""
            
            # Remove any markdown code block indicators
            cleaned = re.sub(r"^```(json)?\s*", "", text.strip(), flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```$", "", cleaned.strip())
            
            # Fix common Python-style literals to JSON
            cleaned = re.sub(r"\bTrue\b", "true", cleaned)
            cleaned = re.sub(r"\bFalse\b", "false", cleaned)
            cleaned = re.sub(r"\bNone\b", "null", cleaned)
            
            # Remove trailing commas before closing braces/brackets
            cleaned = re.sub(r",\s*([}\]])", r"\1", cleaned)
            
            # Ensure keys are quoted (handles {key: "value"} -> {"key": "value"})
            cleaned = re.sub(r"([\{,]\s*)([A-Za-z_][A-Za-z0-9_\-]*)(\s*):", r"\1\"\2\"\3:", cleaned)
            
            # If it looks like it's missing a closing brace, add it
            open_braces = cleaned.count('{')
            close_braces = cleaned.count('}')
            if open_braces > close_braces:
                cleaned += '}' * (open_braces - close_braces)
            
            return cleaned.strip()

        def _loads_relaxed(text: str):
            if not text:
                raise ValueError('Empty text to parse')
                
            repaired = _try_local_repairs(text)
            logger.info(f"Repaired JSON attempt: {repaired[:200]}...")
            
            try:
                return json.loads(repaired)
            except json.JSONDecodeError as e:
                logger.warning(f"JSON standard parse failed: {e}")
                pass
                
            try:
                # ast.literal_eval is great for Python-like dictionaries (single quotes, True/False/None)
                py = ast.literal_eval(repaired)
                if isinstance(py, (dict, list)):
                    return py
            except Exception as e:
                logger.warning(f"AST parse failed: {e}")
                pass
            
            raise ValueError(f'Unable to parse AI output as JSON. Original start: {text[:50]}')

        def _call_ai_json(prompt: str, timeout=(15, 90)):
            payload = {
                'prompt': prompt,
                'max_tokens': 2048,
                'temperature': 0.7
            }
            resp = requests.post(self.chat_endpoint.replace('/chat', '/complete'), json=payload, timeout=timeout)
            if resp.status_code != 200:
                raise Exception(f"AI endpoint error: {resp.status_code}")
            out = resp.text
            logger.info(f"AI raw response: {out}")
            if not out or not out.strip():
                raise ValueError('AI returned empty response')
            extracted = _extract_json_object(out.strip())
            return _loads_relaxed(extracted or out)

        per_question: list[dict] = []

        answered_questions = []
        for q in questions:
            ans = getattr(q, 'answer', None)
            if not ans or not getattr(ans, 'answer_text', '').strip():
                logger.info(f"Skipping interview {interview.id} question {q.order} (no user answer)")
                continue
            answered_questions.append(q)

        if not answered_questions:
            data = {
                'per_question': [],
                'final': {
                    'final_score': 0,
                    'overall_review': '',
                    'key_strengths': [],
                    'key_gaps': [],
                    'hire_recommendation': 'no',
                },
                'status': 'completed',
                '_generated_at': datetime.utcnow().isoformat() + 'Z',
            }
            interview.ai_review = data
            interview.save(update_fields=['ai_review'])
            return data

        def _evaluate_one(q: Question):
            ans = getattr(q, 'answer', None)
            q_prompt = (
                "You are an interview coach. Given a question and the candidate's answer, generate an IDEAL answer (solution path) and improvement guidance. Return ONLY valid JSON object. No conversational text. No explanations. Just the JSON.\n"
                "Score must be between 1 and 10 inclusive.\n"
                "Scoring rules:\n"
                "- If answer says 'I don't know', 'can't generate', or refuses to answer → score 1 or 2\n"
                "- If answer shows no understanding of the topic → score 1 or 2\n"
                "- Score must reflect actual knowledge demonstrated, not just structure\n"
                "Always include ALL fields: order, score, ai_answer (string), strategy_to_improve (string), improvements_needed (array).\n"
                "If no improvements exist, return empty array [].\n"
                f"Role: {interview.job_title}\n"
                f"Difficulty: {interview.difficulty}\n"
                f"Question order: {q.order}\n"
                f"Question: {q.question_text}\n"
                f"Answer: {getattr(ans, 'answer_text', '')}\n\n"
                "ai_answer MUST be the ideal/correct answer the candidate should give (do NOT repeat the candidate's answer).\n"
                "JSON schema:\n"
                "{\n"
                "  \"order\": 1,\n"
                "  \"score\": 1,\n"
                "  \"ai_answer\": \"\",\n"
                "  \"strategy_to_improve\": \"\",\n"
                "  \"improvements_needed\": []\n"
                "}\n"
            )
            logger.info(f"Evaluating interview {interview.id} question {q.order} via AI")
            return _call_ai_json(q_prompt, timeout=(15, 60))

        def _normalize_item(item: dict, q: Question) -> dict:
            # Do not trust model-provided order; ensure every question maps to a unique slot.
            item['order'] = int(q.order)
            try:
                score = int(item.get('score') or 1)
                item['score'] = max(1, min(10, score))
            except (TypeError, ValueError):
                item['score'] = 1

            if 'ai_answer' not in item or not isinstance(item['ai_answer'], str):
                item['ai_answer'] = ''
            if 'strategy_to_improve' not in item or not isinstance(item['strategy_to_improve'], str):
                item['strategy_to_improve'] = ''
            if 'improvements_needed' not in item or not isinstance(item['improvements_needed'], list):
                item['improvements_needed'] = []
            return item

        batch_size = 5
        for i in range(0, len(answered_questions), batch_size):
            batch = answered_questions[i:i + batch_size]
            with concurrent.futures.ThreadPoolExecutor(max_workers=batch_size) as ex:
                future_map = {ex.submit(_evaluate_one, q): q for q in batch}
                for fut in concurrent.futures.as_completed(future_map):
                    q = future_map[fut]
                    try:
                        item = fut.result()
                        if not isinstance(item, dict):
                            raise ValueError('AI returned non-dict')
                        item = _normalize_item(item, q)
                    except Exception as e:
                        logger.error(f"Error evaluating interview {interview.id} question {q.order}: {e}")
                        item = {
                            'order': q.order,
                            'score': 1,
                            'ai_answer': '',
                            'strategy_to_improve': 'AI evaluation failed for this answer. Please retry Full Analysis.',
                            'improvements_needed': [],
                        }

                    per_question.append(item)

                    # Update deterministic score progressively so clients don't stay at 0 while processing.
                    interim_score = 0
                    try:
                        if total_questions_count > 0:
                            interim_score = sum(int(i.get('score') or 0) for i in per_question) / total_questions_count
                    except Exception:
                        interim_score = 0

                    interview.ai_review = {
                        'per_question': per_question,
                        'status': 'processing',
                        'current_step': f"Evaluated {len(per_question)} questions",
                        'final': {
                            'final_score': interim_score,
                        },
                        '_generated_at': datetime.utcnow().isoformat() + 'Z'
                    }
                    interview.ai_final_score = float(interim_score or 0)
                    interview.save(update_fields=['ai_review', 'ai_final_score'])

        per_question = sorted(per_question, key=lambda x: int(x.get('order') or 0))

        deterministic_final_score = 0
        try:
            total_questions = int(len(questions) or 0)
            if total_questions > 0:
                total_score = sum(int(i.get('score') or 0) for i in per_question)
                deterministic_final_score = total_score / total_questions
        except Exception:
            deterministic_final_score = 0

        # Truncate per_question data if it's too long to avoid 400 error (AI code has 4000 char limit)
        per_question_json = json.dumps(per_question, ensure_ascii=False)
        if len(per_question_json) > 3000:
             logger.warning(f"Per-question data too long ({len(per_question_json)}), truncating for summary")
             per_question_json = per_question_json[:3000] + "... [truncated]"

        final_prompt = (
            "Given the per-question scores and reviews, produce the FINAL interview evaluation. Return ONLY valid JSON object. No conversational text. No explanations. Just the JSON.\n\n"
            "Calculate the final_score as the average of all per-question scores.\n"
            f"Total questions: {len(questions)}\n"
            f"Role: {interview.job_title}\n"
            f"Difficulty: {interview.difficulty}\n"
            f"Skills: {interview.skills}\n\n"
            "Per-question data:\n" + per_question_json + "\n\n"
            "JSON schema:\n"
            "{\n"
            "  \"final_score\": 1,\n"
            "  \"overall_review\": \"...\",\n"
            "  \"key_strengths\": [\"...\"],\n"
            "  \"key_gaps\": [\"...\"],\n"
            "  \"hire_recommendation\": \"strong_yes|yes|maybe|no|strong_no\"\n"
            "}"
        )
        
        logger.info(f"Evaluating final summary for interview {interview.id} via AI. Per-question data length: {len(per_question_json)}")
        try:
            final = _call_ai_json(final_prompt, timeout=(15, 60))
        except Exception as e:
            logger.error(f"Error evaluating final summary for interview {interview.id}: {e}")
            final = None
        
        if not isinstance(final, dict):
            final = {}

        if 'overall_review' not in final or not isinstance(final.get('overall_review'), str):
            final['overall_review'] = ''
        if 'key_strengths' not in final or not isinstance(final.get('key_strengths'), list):
            final['key_strengths'] = []
        if 'key_gaps' not in final or not isinstance(final.get('key_gaps'), list):
            final['key_gaps'] = []
        if 'hire_recommendation' not in final or not isinstance(final.get('hire_recommendation'), str):
            final['hire_recommendation'] = 'no'

        final['final_score'] = deterministic_final_score

        # Decision protocol based on score ranges
        if deterministic_final_score < 2.5:
            final['hire_recommendation'] = 'no'
        elif deterministic_final_score < 5:
            final['hire_recommendation'] = 'maybe'
        elif deterministic_final_score < 7.5:
            final['hire_recommendation'] = 'yes'
        else:
            final['hire_recommendation'] = 'strong_yes'

        data = {
            'per_question': per_question,
            'final': final,
            'status': 'completed',
            '_generated_at': datetime.utcnow().isoformat() + 'Z',
        }
        # Update one last time
        interview.ai_review = data
        interview.save(update_fields=['ai_review'])
        return data
