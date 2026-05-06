// app/evaluations/[id]/page.tsx
// Evaluation detail page

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError, toastConfirm, toastWarning } from '@/lib/toast';

interface EvaluationResponse {
  id: number;
  indicatorId: number;
  score: number; // เป้าหมายการพัฒนา (Desired State / Target)
  score2: number | null; // สภาพที่เป็นอยู่ (Current State) - สำหรับ Q-Model
  comment: string | null;
  indicator?: {
    itemCode: string | null;
    textTh: string;
    maxScore: number;
    minScore: number;
  };
}

interface Section {
  id: number;
  nameTh: string;
  nameEn: string | null;
  order: number;
  indicators: Array<{
    id: number;
    itemCode: string | null;
    textTh: string;
    scaleType: string;
    minScore: number;
    maxScore: number;
  }>;
}

interface Instrument {
  id: number;
  nameTh: string;
  type: string;
  sections?: Section[];
}

interface Evaluation {
  id: number;
  instrumentId: number;
  schoolId: number;
  evaluatorId: number;
  status: string;
  note: string | null;
  createdAt: string;
  submittedAt: string | null;
  instrument?: Instrument;
  responses?: EvaluationResponse[];
}

export default function EvaluationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [token, setToken] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [responses, setResponses] = useState<Record<number, { score: number; score2: number | null; comment: string }>>({});
  const [aiEnabled, setAiEnabled] = useState(false);
  const [latestRunId, setLatestRunId] = useState<number | null>(null);
  const [startingRun, setStartingRun] = useState(false);
  const [meId, setMeId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Anyone can view this page; only the creator (or ADMIN) can save/submit edits.
  const canEdit = !!evaluation && (isAdmin || meId === evaluation.evaluatorId);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/login');
      return;
    }
    setToken(storedToken);

    // Fetch feature flags for the current school (cheap, fire-and-forget)
    fetch('/api/feature-flags/me', { headers: { Authorization: `Bearer ${storedToken}` } })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data?.flags?.aiEnabled) setAiEnabled(true);
      })
      .catch(() => {});

    // Identify current user for the canEdit gate
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${storedToken}` } })
      .then((r) => r.json())
      .then((j) => {
        if (j?.success && j.data) {
          setMeId(j.data.id);
          setIsAdmin(Array.isArray(j.data.roles) && j.data.roles.includes('ADMIN'));
        }
      })
      .catch(() => {});

    if (id && id !== 'new') {
      const evalId = parseInt(id, 10);
      if (!isNaN(evalId)) {
        fetchEvaluation(storedToken, evalId);
      } else {
        setLoading(false);
        setEvaluation(null);
      }
    } else {
      setLoading(false);
      setEvaluation(null);
    }
  }, [id, router]);

  const fetchEvaluation = async (authToken: string, evalId: number) => {
    try {
      const res = await fetch(`/api/evaluations/${evalId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch evaluation');
      }

      const data = await res.json();
      const evalData = data.success ? data.data : data;
      setEvaluation(evalData);

      // Fetch instrument details with sections and indicators
      if (evalData.instrumentId) {
        const instrumentRes = await fetch(`/api/instruments/${evalData.instrumentId}`, {
          headers: { 'Authorization': `Bearer ${authToken}` },
        });

        if (instrumentRes.ok) {
          const instrumentData = await instrumentRes.json();
          if (instrumentData.success && instrumentData.data) {
            setInstrument(instrumentData.data);
          } else if (instrumentData.sections) {
            setInstrument(instrumentData);
          }
        }
      }

      // Fetch existing responses
      const responsesRes = await fetch(`/api/evaluations/${evalId}/responses`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (responsesRes.ok) {
        const responsesData = await responsesRes.json();
        if (responsesData.success && responsesData.data) {
          const existingResponses: Record<number, { score: number; score2: number | null; comment: string }> = {};
          responsesData.data.forEach((r: EvaluationResponse) => {
            existingResponses[r.indicatorId] = {
              score: r.score,
              score2: r.score2 || null,
              comment: r.comment || '',
            };
          });
          setResponses(existingResponses);
        } else if (Array.isArray(responsesData)) {
          const existingResponses: Record<number, { score: number; score2: number | null; comment: string }> = {};
          responsesData.forEach((r: EvaluationResponse) => {
            existingResponses[r.indicatorId] = {
              score: r.score,
              score2: r.score2 || null,
              comment: r.comment || '',
            };
          });
          setResponses(existingResponses);
        }
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!token || !evaluation || !instrument) return;

    setSaving(true);
    try {
      const responsesArray = Object.entries(responses).map(([indicatorId, data]) => ({
        indicatorId: parseInt(indicatorId, 10),
        score: data.score,
        score2: data.score2 !== undefined && data.score2 !== null ? data.score2 : null,
        comment: data.comment || null,
      }));

      if (responsesArray.length === 0) {
        toastWarning('กรุณากรอกข้อมูลก่อนบันทึก');
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/evaluations/${evaluation.id}/responses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ responses: responsesArray }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toastSuccess('บันทึกข้อมูลสำเร็จ');
        // Refresh responses
        const responsesRes = await fetch(`/api/evaluations/${evaluation.id}/responses`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (responsesRes.ok) {
          const responsesData = await responsesRes.json();
          if (responsesData.success && responsesData.data) {
            const existingResponses: Record<number, { score: number; score2: number | null; comment: string }> = {};
            responsesData.data.forEach((r: EvaluationResponse) => {
              existingResponses[r.indicatorId] = {
                score: r.score,
                score2: r.score2 || null,
                comment: r.comment || '',
              };
            });
            setResponses(existingResponses);
          }
        }
      } else {
        toastError(data.error || 'บันทึกข้อมูลไม่สำเร็จ');
      }
    } catch (err) {
      toastError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!token || !evaluation) return;

    toastConfirm(
      'ยืนยันการส่งแบบประเมิน? หลังจากส่งแล้วจะไม่สามารถแก้ไขได้',
      async () => {
        setSubmitting(true);
        try {
          // Save responses first
          const responsesArray = Object.entries(responses).map(([indicatorId, data]) => ({
            indicatorId: parseInt(indicatorId, 10),
            score: data.score,
            score2: data.score2 !== undefined && data.score2 !== null ? data.score2 : null,
            comment: data.comment || null,
          }));

          if (responsesArray.length > 0) {
            await fetch(`/api/evaluations/${evaluation.id}/responses`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ responses: responsesArray }),
            });
          }

          // Update status to SUBMITTED
          const res = await fetch(`/api/evaluations/${evaluation.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'SUBMITTED' }),
          });

          const data = await res.json();
          if (res.ok && data.success) {
            toastSuccess('ส่งแบบประเมินสำเร็จ');
            router.push('/evaluations');
          } else {
            toastError(data.error || 'ส่งแบบประเมินไม่สำเร็จ');
          }
        } catch (err) {
          toastError('เกิดข้อผิดพลาดในการส่งแบบประเมิน');
        } finally {
          setSubmitting(false);
        }
      }
    );
  };

  const renderIndicatorInput = (indicator: Section['indicators'][0]) => {
    // Read-only when SUBMITTED, or when current user is not the owner / not an ADMIN.
    const isReadOnly = evaluation?.status === 'SUBMITTED' || !canEdit;
    const response = responses[indicator.id] || {
      score: 0,
      score2: null,
      comment: ''
    };

    return (
      <div
        key={indicator.id}
        style={{
          padding: '1.5rem',
          background: '#f9fafb',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
          marginBottom: '1rem'
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'start', marginBottom: '1rem' }}>
          {indicator.itemCode && (
            <span style={{
              padding: '0.25rem 0.5rem',
              background: '#e0e7ff',
              color: '#4338ca',
              borderRadius: '0.25rem',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              minWidth: '80px',
              textAlign: 'center'
            }}>
              {indicator.itemCode}
            </span>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ color: '#333', marginBottom: '0.5rem', fontWeight: '500', fontSize: '1rem' }}>
              {indicator.textTh}
            </div>
          </div>
        </div>

        {/* Rating Input - สภาพที่เป็นอยู่ (score2) */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            color: '#666', 
            fontSize: '0.875rem',
            fontWeight: '600'
          }}>
            สภาพที่เป็นอยู่ ({indicator.minScore} - {indicator.maxScore})
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {Array.from({ length: indicator.maxScore - indicator.minScore + 1 }, (_, i) => {
              const score = indicator.minScore + i;
              const isSelected = response.score2 === score;
              return (
                <label
                  key={score}
                  style={{
                    padding: '0.5rem 1rem',
                    border: `2px solid ${isSelected ? '#ef4444' : '#ddd'}`,
                    borderRadius: '0.5rem',
                    background: isSelected ? '#ef4444' : 'white',
                    color: isSelected ? 'white' : '#333',
                    cursor: isReadOnly ? 'default' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: isSelected ? 'bold' : 'normal',
                    transition: 'all 0.2s'
                  }}
                >
                  <input
                    type="radio"
                    name={`indicator-${indicator.id}-score2`}
                    value={score}
                    checked={isSelected}
                    onChange={(e) => {
                      if (!isReadOnly) {
                        setResponses({
                          ...responses,
                          [indicator.id]: {
                            ...response,
                            score2: parseInt(e.target.value, 10)
                          }
                        });
                      }
                    }}
                    disabled={isReadOnly}
                    style={{ display: 'none' }}
                  />
                  {score}
                </label>
              );
            })}
          </div>
        </div>

        {/* Rating Input - เป้าหมายการพัฒนา (score) */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            color: '#666',
            fontSize: '0.875rem',
            fontWeight: '600'
          }}>
            เป้าหมายการพัฒนา ({indicator.minScore} - {indicator.maxScore})
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {Array.from({ length: indicator.maxScore - indicator.minScore + 1 }, (_, i) => {
              const score = indicator.minScore + i;
              const isSelected = response.score === score;
              return (
                <label
                  key={score}
                  style={{
                    padding: '0.5rem 1rem',
                    border: `2px solid ${isSelected ? '#2563eb' : '#ddd'}`,
                    borderRadius: '0.5rem',
                    background: isSelected ? '#2563eb' : 'white',
                    color: isSelected ? 'white' : '#333',
                    cursor: isReadOnly ? 'default' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: isSelected ? 'bold' : 'normal',
                    transition: 'all 0.2s'
                  }}
                >
                  <input
                    type="radio"
                    name={`indicator-${indicator.id}-score`}
                    value={score}
                    checked={isSelected}
                    onChange={(e) => {
                      if (!isReadOnly) {
                        setResponses({
                          ...responses,
                          [indicator.id]: {
                            ...response,
                            score: parseInt(e.target.value, 10)
                          }
                        });
                      }
                    }}
                    disabled={isReadOnly}
                    style={{ display: 'none' }}
                  />
                  {score}
                </label>
              );
            })}
          </div>
        </div>

        {/* Comment Input */}
        {!isReadOnly && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#666', fontSize: '0.875rem' }}>
              ความคิดเห็นเพิ่มเติม (ไม่บังคับ)
            </label>
            <textarea
              value={response.comment}
              onChange={(e) => {
                setResponses({
                  ...responses,
                  [indicator.id]: {
                    ...response,
                    comment: e.target.value
                  }
                });
              }}
              rows={2}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
              placeholder="บันทึกความคิดเห็นหรือข้อสังเกต..."
            />
          </div>
        )}

        {isReadOnly && response.comment && (
          <div style={{
            marginTop: '0.5rem',
            padding: '0.75rem',
            background: 'white',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            color: '#666'
          }}>
            💬 {response.comment}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>กำลังโหลดข้อมูล...</div>;
  }

  if (!evaluation) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>ไม่พบข้อมูล</div>;
  }

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Link
            href="/evaluations"
            style={{
              padding: '0.5rem 1rem',
              background: '#667eea',
              color: 'white',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              display: 'inline-block',
              marginBottom: '1rem'
            }}
          >
            ← กลับ
          </Link>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', marginBottom: '0.5rem' }}>
            การประเมิน #{evaluation.id}
          </h1>
          <p style={{ color: '#666' }}>
            {evaluation.instrument?.nameTh || 'N/A'}
          </p>
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
            <span style={{
              padding: '0.25rem 0.5rem',
              background: evaluation.status === 'SUBMITTED' ? '#d1fae5' : '#fef3c7',
              color: evaluation.status === 'SUBMITTED' ? '#065f46' : '#92400e',
              borderRadius: '0.25rem',
              fontSize: '0.875rem'
            }}>
              {evaluation.status === 'SUBMITTED' ? 'ส่งแล้ว' : 'ร่าง'}
            </span>
            <span style={{ fontSize: '0.875rem', color: '#666' }}>
              สร้างเมื่อ: {new Date(evaluation.createdAt).toLocaleDateString('th-TH')}
            </span>
          </div>
        </div>

        {/* Evaluation Form */}
        {instrument && instrument.sections && instrument.sections.length > 0 ? (
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#333' }}>
              แบบประเมิน Q-Model
            </h2>

            {/* Sections */}
            {instrument.sections.map((section) => (
              <div
                key={section.id}
                style={{
                  marginBottom: '2rem',
                  paddingBottom: '2rem',
                  borderBottom: section.id !== instrument.sections![instrument.sections!.length - 1].id ? '2px solid #e5e7eb' : 'none'
                }}
              >
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  marginBottom: '1rem',
                  color: '#4338ca',
                  padding: '0.75rem',
                  background: '#e0e7ff',
                  borderRadius: '0.5rem'
                }}>
                  {section.nameTh}
                  {section.nameEn && (
                    <span style={{ fontSize: '0.9rem', color: '#666', marginLeft: '0.5rem', fontWeight: 'normal' }}>
                      ({section.nameEn})
                    </span>
                  )}
                </h3>

                {/* Indicators */}
                {section.indicators && section.indicators.length > 0 ? (
                  <div>
                    {section.indicators.map((indicator) => renderIndicatorInput(indicator))}
                  </div>
                ) : (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#666', fontSize: '0.875rem' }}>
                    ไม่มีตัวชี้วัดใน section นี้
                  </div>
                )}
              </div>
            ))}

            {/* Read-only banner for non-owners */}
            {!canEdit && evaluation.status !== 'SUBMITTED' && (
              <div style={{
                padding: '1rem',
                background: '#fef3c7',
                color: '#92400e',
                borderRadius: '0.5rem',
                marginTop: '2rem',
                textAlign: 'center',
                fontSize: '0.9rem',
              }}>
                👁 คุณกำลังดูการประเมินของผู้อื่น — แก้ไขได้เฉพาะเจ้าของเท่านั้น
              </div>
            )}

            {/* Action Buttons */}
            {evaluation.status !== 'SUBMITTED' && canEdit && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid #e5e7eb' }}>
                <button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: saving ? '#ccc' : '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  {saving ? 'กำลังบันทึก...' : '💾 บันทึกชั่วคราว (Draft)'}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: submitting ? '#ccc' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  {submitting ? 'กำลังส่ง...' : '✅ ส่งแบบประเมิน (Submit)'}
                </button>
              </div>
            )}

            {evaluation.status === 'SUBMITTED' && (
              <div style={{
                padding: '1rem',
                background: '#d1fae5',
                color: '#065f46',
                borderRadius: '0.5rem',
                marginTop: '2rem',
                textAlign: 'center'
              }}>
                ✅ แบบประเมินนี้ส่งแล้ว ไม่สามารถแก้ไขได้
              </div>
            )}

            {/* AI + SOAR card — only when feature is enabled for this school */}
            {evaluation.status === 'SUBMITTED' && aiEnabled && evaluation.instrument?.type === 'Q_MODEL' && (
              <div style={{
                marginTop: '1.25rem',
                padding: '1.25rem 1.5rem',
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                borderRadius: '0.5rem',
                color: 'white',
                boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>🤖</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>AI + SOAR Coach</div>
                    <div style={{ fontSize: '0.82rem', color: '#c7d2fe' }}>
                      วิเคราะห์ผลประเมินเป็น Strengths · Opportunities · Aspirations · Results พร้อมแผน 90 วัน
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={async () => {
                      if (!token || startingRun) return;
                      setStartingRun(true);
                      try {
                        const res = await fetch(`/api/ai/soar/analyze-evaluation/${evaluation.id}`, {
                          method: 'POST', headers: { Authorization: `Bearer ${token}` },
                        });
                        const json = await res.json();
                        if (res.ok && json.success) {
                          setLatestRunId(json.data.runId);
                          router.push(`/evaluations/${evaluation.id}/insights?runId=${json.data.runId}`);
                        } else {
                          toastError(json.error || 'ไม่สามารถเริ่มวิเคราะห์');
                        }
                      } catch {
                        toastError('เกิดข้อผิดพลาด');
                      } finally {
                        setStartingRun(false);
                      }
                    }}
                    disabled={startingRun}
                    style={{
                      padding: '0.6rem 1.25rem',
                      background: startingRun ? '#6366f1' : '#818cf8',
                      color: 'white', border: 'none', borderRadius: '0.4rem',
                      cursor: startingRun ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.9rem',
                    }}
                  >
                    {startingRun ? 'กำลังเริ่ม...' : '🚀 วิเคราะห์ด้วย AI + SOAR'}
                  </button>
                  <Link
                    href={`/evaluations/${evaluation.id}/insights${latestRunId ? `?runId=${latestRunId}` : ''}`}
                    style={{
                      padding: '0.6rem 1.25rem',
                      background: 'rgba(255,255,255,0.1)',
                      color: 'white', borderRadius: '0.4rem', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem',
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  >
                    📊 ดู Insights ที่เคยวิเคราะห์
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            color: '#666'
          }}>
            {!instrument ? 'กำลังโหลดข้อมูลเครื่องมือประเมิน...' : 'ไม่พบข้อมูลเครื่องมือประเมิน'}
          </div>
        )}
      </div>
    </div>
  );
}

