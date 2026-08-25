import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

type QType = 'short_text' | 'paragraph' | 'single_choice' | 'multi_choice' | 'file_upload' | 'date';

interface QuestionCondition {
  questionId: string;
  equals?: string;
  includes?: string;
}

interface Question {
  id: string;
  type: QType;
  label: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  description?: string;
  dependsOn?: QuestionCondition;
  requiredIf?: { questionId: string; values: string[] };
}

function isConditionMet(condition: QuestionCondition, answers: Record<string, string | string[]>): boolean {
  const answer = answers[condition.questionId];
  if (condition.includes) return Array.isArray(answer) && answer.includes(condition.includes);
  if (condition.equals) return answer === condition.equals;
  return true;
}

function isVisible(question: Question, answers: Record<string, string | string[]>): boolean {
  return !question.dependsOn || isConditionMet(question.dependsOn, answers);
}

function isRequired(question: Question, answers: Record<string, string | string[]>): boolean {
  if (question.required) return true;
  if (question.requiredIf) return question.requiredIf.values.includes(answers[question.requiredIf.questionId] as string);
  return false;
}

interface Questionnaire {
  id: number;
  service_type: string;
  client_name: string;
  token: string;
  status: 'draft' | 'sent' | 'submitted';
  questions: Question[];
  answers: Record<string, string | string[]> | null;
  intro_message: string | null;
}

export default function PublicQuestionnairePage() {
  const { token } = useParams<{ token: string }>();
  const [q, setQ] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    // Goes through the edge function, not the table. Matching a token is a
    // capability check, and RLS cannot see the token in the request -- the only
    // policy that made a direct anon query work was using(true), which let
    // anyone list every questionnaire.
    supabase.functions
      .invoke('public-questionnaire', { body: { mode: 'get', token } })
      .then(({ data, error }) => {
        const row = data?.questionnaire as Questionnaire | undefined;
        if (error || !row) { setNotFound(true); }
        else if (row.status === 'submitted') { setSubmitted(true); setQ(row); }
        else { setQ(row); }
        setLoading(false);
      });
  }, [token]);

  const setAnswer = (id: string, value: string | string[]) =>
    setAnswers(prev => ({ ...prev, [id]: value }));

  const handleFileUpload = async (questionId: string, file: File) => {
    setUploading(prev => ({ ...prev, [questionId]: true }));
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke('upload-to-drive', {
        body: {
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          base64Content: base64,
          type: 'questionnaire_moodboard',
          meta: { client_name: q?.client_name ?? 'Unknown' },
        },
      });
      if (error || data?.error) throw new Error(error?.message ?? data?.error);
      const driveUrl: string = data.url;
      setUploadedFiles(prev => ({ ...prev, [questionId]: file.name }));
      setAnswer(questionId, driveUrl);
    } catch {
      setErrors(prev => ({ ...prev, [questionId]: 'Upload failed — try a link instead.' }));
    } finally {
      setUploading(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const toggleMulti = (id: string, option: string) => {
    const curr = (answers[id] as string[]) ?? [];
    setAnswer(id, curr.includes(option) ? curr.filter(x => x !== option) : [...curr, option]);
  };

  const validate = () => {
    if (!q) return false;
    const errs: Record<string, string> = {};
    q.questions.forEach(question => {
      if (!isVisible(question, answers) || !isRequired(question, answers)) return;
      const a = answers[question.id];
      if (!a || (Array.isArray(a) ? a.length === 0 : a.trim() === '')) {
        errs[question.id] = 'This question is required.';
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async () => {
    if (submitting || !validate() || !q) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke('public-questionnaire', {
      body: { mode: 'submit', token: token!, answers },
    });
    setSubmitting(false);
    if (error || !data?.ok) { setErrors({ _form: 'Something went wrong. Please try again.' }); return; }
    await supabase.functions.invoke('notify-questionnaire-submitted', {
      body: { client_name: q!.client_name, service_type: q!.service_type },
    });
    setSubmitted(true);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <i className="ri-loader-4-line animate-spin text-2xl text-gray-300"></i>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <i className="ri-error-warning-line text-2xl text-gray-400"></i>
        </div>
        <h1 className="text-lg font-bold text-gray-800 mb-2">Link not found</h1>
        <p className="text-sm text-gray-500">This questionnaire link is invalid or has expired.</p>
      </div>
    </div>
  );

  if (submitted && q) return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="bg-[#111827] px-6 py-5">
        <div className="max-w-2xl mx-auto">
          <img src="https://www.hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png"
            alt="Huna Creatives" className="h-7" />
        </div>
      </div>

      <div className="bg-white border-b border-gray-100 px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <i className="ri-check-line text-emerald-600"></i>
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Already answered</span>
          </div>
          <h1 className="text-2xl font-bold text-[#111827] mb-2">
            Thanks{q.client_name ? `, ${q.client_name.split(' ')[0]}` : ''}! This questionnaire has been submitted.
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Someone has already answered this — it's locked from further edits. Here's what was submitted, for reference.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
        {q.questions.filter(question => isVisible(question, q.answers ?? {})).map((question, i) => {
          const answer = q.answers?.[question.id];
          const hasAnswer = answer && (Array.isArray(answer) ? answer.length > 0 : answer.trim() !== '');
          return (
            <div key={question.id} className="bg-white border border-gray-100 rounded-2xl p-5">
              <p className="text-sm font-semibold text-[#111827] mb-2">
                <span className="text-gray-300 font-mono text-xs mr-2">{String(i + 1).padStart(2, '0')}</span>
                {question.label}
              </p>
              {hasAnswer ? (
                Array.isArray(answer) ? (
                  <div className="flex flex-wrap gap-1.5">
                    {answer.map(a => <span key={a} className="text-xs bg-[#FF6B35]/10 text-[#FF6B35] px-2 py-0.5 rounded-full font-medium">{a}</span>)}
                  </div>
                ) : question.type === 'file_upload' && (answer as string).startsWith('http') ? (
                  <a href={answer as string} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-[#FF6B35] hover:underline bg-orange-50 rounded-lg px-3 py-2">
                    <i className="ri-external-link-line text-xs"></i> View file →
                  </a>
                ) : (
                  <p className="text-sm text-[#111827] bg-gray-50 rounded-lg px-3 py-2">{answer}</p>
                )
              ) : (
                <p className="text-xs text-gray-300 italic">No answer</p>
              )}
            </div>
          );
        })}

        <p className="text-center text-xs text-gray-400 pb-8">
          © {new Date().getFullYear()} Huna Creatives · Your answers are shared only with the Huna Creatives team.
        </p>
      </div>
    </div>
  );

  if (!q) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <div className="bg-[#111827] px-6 py-5">
        <div className="max-w-2xl mx-auto">
          <img src="https://www.hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png"
            alt="Huna Creatives" className="h-7" />
        </div>
      </div>

      {/* Hero */}
      <div className="bg-white border-b border-gray-100 px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <span className="text-xs font-semibold text-[#FF6B35] uppercase tracking-wider">{q.service_type}</span>
          <h1 className="text-2xl font-bold text-[#111827] mt-1 mb-2">
            Hi {q.client_name.split(' ')[0]}, tell us about your project
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            {q.intro_message || `We'd love to understand your ${q.service_type.toLowerCase()} needs before putting together your proposal. This takes about 5 minutes.`}
          </p>
        </div>
      </div>

      {/* Questions */}
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {q.questions.filter(question => isVisible(question, answers)).map((question, i) => (
          <div key={question.id} className="bg-white border border-gray-100 rounded-2xl p-5">
            <label className={`block text-sm font-semibold text-[#111827] ${question.description ? 'mb-1' : 'mb-3'}`}>
              <span className="text-gray-300 font-mono text-xs mr-2">{String(i + 1).padStart(2, '0')}</span>
              {question.label}
              {isRequired(question, answers) && <span className="text-red-400 ml-1">*</span>}
            </label>
            {question.description && (
              <p className="text-xs text-gray-400 mb-3 whitespace-pre-line">{question.description}</p>
            )}

            {question.type === 'date' && (
              <input
                type="date"
                value={(answers[question.id] as string) ?? ''}
                onChange={e => setAnswer(question.id, e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]"
              />
            )}

            {question.type === 'short_text' && (
              <input
                type="text"
                value={(answers[question.id] as string) ?? ''}
                onChange={e => setAnswer(question.id, e.target.value)}
                placeholder={question.placeholder ?? ''}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]"
              />
            )}

            {question.type === 'paragraph' && (
              <textarea
                value={(answers[question.id] as string) ?? ''}
                onChange={e => setAnswer(question.id, e.target.value)}
                placeholder={question.placeholder ?? ''}
                rows={4}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] resize-none"
              />
            )}

            {question.type === 'single_choice' && question.options && (
              <div className="space-y-2">
                {question.options.map(opt => (
                  <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      answers[question.id] === opt ? 'border-[#FF6B35] bg-[#FF6B35]' : 'border-gray-300 group-hover:border-gray-400'
                    }`} onClick={() => setAnswer(question.id, opt)}>
                      {answers[question.id] === opt && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <span className="text-sm text-gray-700" onClick={() => setAnswer(question.id, opt)}>{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {question.type === 'file_upload' && (
              <div className="space-y-3">
                {/* File picker */}
                <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl px-4 py-6 cursor-pointer transition-colors ${
                  uploading[question.id] ? 'border-[#FF6B35]/40 bg-orange-50' :
                  uploadedFiles[question.id] ? 'border-emerald-300 bg-emerald-50' :
                  'border-gray-200 hover:border-[#FF6B35]/50 hover:bg-orange-50/30'
                }`}>
                  <input type="file" className="hidden" accept="image/*,.pdf"
                    disabled={uploading[question.id]}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(question.id, f); }} />
                  {uploading[question.id] ? (
                    <><i className="ri-loader-4-line animate-spin text-[#FF6B35] text-xl"></i>
                    <span className="text-sm text-[#FF6B35] font-medium">Uploading…</span></>
                  ) : uploadedFiles[question.id] ? (
                    <><i className="ri-check-circle-line text-emerald-500 text-xl"></i>
                    <span className="text-sm text-emerald-700 font-medium">{uploadedFiles[question.id]}</span>
                    <span className="text-xs text-emerald-500">Tap to replace</span></>
                  ) : (
                    <><i className="ri-upload-cloud-line text-gray-300 text-2xl"></i>
                    <span className="text-sm text-gray-500 font-medium">Click to upload a file</span>
                    <span className="text-xs text-gray-400">Images or PDF · max 10 MB</span></>
                  )}
                </label>
                {/* Link fallback */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-gray-100"></div>
                  <span className="text-xs text-gray-400">or paste a link</span>
                  <div className="flex-1 h-px bg-gray-100"></div>
                </div>
                <input
                  type="url"
                  value={uploadedFiles[question.id] ? '' : ((answers[question.id] as string) ?? '')}
                  onChange={e => { setUploadedFiles(prev => { const n = {...prev}; delete n[question.id]; return n; }); setAnswer(question.id, e.target.value); }}
                  placeholder="Pinterest, Google Drive, or any URL…"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]"
                />
              </div>
            )}

            {question.type === 'multi_choice' && question.options && (
              <div className="space-y-2">
                {question.options.map(opt => {
                  const selected = ((answers[question.id] as string[]) ?? []).includes(opt);
                  return (
                    <label key={opt} className="flex items-center gap-3 cursor-pointer group" onClick={() => toggleMulti(question.id, opt)}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        selected ? 'border-[#FF6B35] bg-[#FF6B35]' : 'border-gray-300 group-hover:border-gray-400'
                      }`}>
                        {selected && <i className="ri-check-line text-white text-[10px]"></i>}
                      </div>
                      <span className="text-sm text-gray-700">{opt}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {errors[question.id] && (
              <p className="text-xs text-red-500 mt-2">{errors[question.id]}</p>
            )}
          </div>
        ))}

        {errors._form && <p className="text-sm text-red-500 text-center">{errors._form}</p>}

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full py-3.5 bg-[#FF6B35] text-white font-semibold rounded-xl hover:bg-[#e55a27] transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
        >
          {submitting ? <><i className="ri-loader-4-line animate-spin text-base"></i> Submitting…</> : 'Submit Questionnaire →'}
        </button>

        <p className="text-center text-xs text-gray-400 pb-8">
          © {new Date().getFullYear()} Huna Creatives · Your answers are shared only with the Huna Creatives team.
        </p>
      </div>
    </div>
  );
}
