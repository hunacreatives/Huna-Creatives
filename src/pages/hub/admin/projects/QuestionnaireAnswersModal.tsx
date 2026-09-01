// Read-only viewer for a client questionnaire's submitted answers.

export interface WsQuestionnaireRow { id: number; client_name: string; service_type: string; status: string; submitted_at: string | null; questions: { id: string; label: string; type: string; required?: boolean }[]; answers: Record<string, string | string[]> | null; }

export default function QuestionnaireAnswersModal({ q, onClose }: { q: WsQuestionnaireRow; onClose: () => void }) {
  return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0" onClick={() => onClose()}>
          <div className="bg-white rounded-2xl w-full sm:max-w-lg max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3 flex-shrink-0">
              <div>
                <h3 className="text-sm font-bold text-[#111827]">{q.client_name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{q.service_type}</p>
              </div>
              <button onClick={() => onClose()} className="text-gray-400 hover:text-gray-600 cursor-pointer mt-0.5"><i className="ri-close-line text-lg"></i></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {q.status === 'submitted' && q.answers ? (
                q.questions.map(question => {
                  const answer = q.answers![question.id];
                  const hasAnswer = answer && (Array.isArray(answer) ? answer.length > 0 : String(answer).trim() !== '');
                  return (
                    <div key={question.id} className="space-y-1.5">
                      <p className="text-xs font-medium text-gray-700">{question.label}{question.required && <span className="text-red-400 ml-0.5">*</span>}</p>
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
                })
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">No responses yet — questionnaire is {q.status}.</p>
              )}
            </div>
          </div>
        </div>
  );
}
