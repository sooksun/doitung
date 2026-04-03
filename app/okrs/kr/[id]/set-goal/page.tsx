// app/okrs/kr/[id]/set-goal/page.tsx
// Set Goal page for Key Result - Set goals for all actions

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError } from '@/lib/toast';

interface OKRAction {
  id: number;
  title: string;
  description: string | null;
  order: number;
  targetDesiredState: number | null;
}

interface OKRKeyResult {
  id: number;
  title: string;
  description: string | null;
  objective?: {
    id: number;
    title: string;
    description: string | null;
    dimension: string | null;
  };
  actions?: OKRAction[];
}

// Star Rating Component
function StarRating({
  value,
  onChange,
  disabled = false,
  label,
}: {
  value: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  label: string;
}) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333' }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = hoverValue !== null ? star <= hoverValue : star <= value;
          return (
            <button
              key={star}
              type="button"
              onClick={() => !disabled && onChange && onChange(star)}
              onMouseEnter={() => !disabled && setHoverValue(star)}
              onMouseLeave={() => !disabled && setHoverValue(null)}
              disabled={disabled}
              style={{
                background: 'none',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                padding: '0.5rem 0.75rem',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                color: isActive ? '#fbbf24' : '#9ca3af',
                backgroundColor: isActive ? '#fef3c7' : '#f9fafb',
                transition: 'all 0.2s',
                opacity: disabled ? 0.6 : 1,
              }}
            >
              {star}
            </button>
          );
        })}
        <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
          {value} / 5
        </span>
      </div>
    </div>
  );
}

export default function SetGoalPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [token, setToken] = useState<string | null>(null);
  const [keyResult, setKeyResult] = useState<OKRKeyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionGoals, setActionGoals] = useState<Record<number, number | null>>({});

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/login');
      return;
    }
    setToken(storedToken);
    if (id) {
      fetchKeyResult(storedToken, parseInt(id));
    }
  }, [id, router]);

  const fetchKeyResult = async (authToken: string, krId: number) => {
    try {
      setLoading(true);
      // Fetch Key Result details with actions
      const krRes = await fetch(`/api/okrs/key-results/${krId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      console.log('API Response status:', krRes.status);
      
      if (!krRes.ok) {
        const errorData = await krRes.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', errorData);
        toastError(`เกิดข้อผิดพลาด: ${errorData.error || 'ไม่สามารถดึงข้อมูลได้'}`);
        return;
      }

      const krData = await krRes.json();
      console.log('API Response data:', krData);
      
      if (krData.success && krData.data) {
        const kr = krData.data;
        const goals: Record<number, number | null> = {};
        
        if (kr.actions && Array.isArray(kr.actions)) {
          kr.actions.forEach((action: any) => {
            goals[action.id] = action.targetDesiredState ?? null;
          });
        }

        setActionGoals(goals);
        setKeyResult({
          id: kr.id,
          title: kr.title || 'Key Result',
          description: kr.description,
          objective: kr.objective,
          actions: kr.actions || [],
        });
      } else {
        console.error('Invalid response format:', krData);
        toastError('รูปแบบข้อมูลไม่ถูกต้อง');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      toastError('เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoal = async (actionId: number, targetDesiredState: number | null) => {
    if (!token) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/okrs/actions/${actionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetDesiredState }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setActionGoals(prev => ({
          ...prev,
          [actionId]: targetDesiredState,
        }));
        // Update keyResult state
        setKeyResult(prev => {
          if (!prev) return null;
          return {
            ...prev,
            actions: prev.actions?.map(a => 
              a.id === actionId ? { ...a, targetDesiredState } : a
            ),
          };
        });
        toastSuccess('บันทึกค่าเป้าหมายสำเร็จ');
      } else {
        toastError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      toastError('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    if (!token || !keyResult || !keyResult.actions) return;

    setSaving(true);
    try {
      const promises = keyResult.actions.map(action => {
        const targetDesiredState = actionGoals[action.id] ?? null;
        return fetch(`/api/okrs/actions/${action.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ targetDesiredState }),
        });
      });

      await Promise.all(promises);
      toastSuccess('บันทึกค่าเป้าหมายทั้งหมดสำเร็จ');
      router.push(`/okrs/kr/${id}`);
    } catch (err) {
      toastError('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        padding: '2rem', 
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5'
      }}>
        <div>
          <div style={{ fontSize: '1.25rem', color: '#666', marginBottom: '1rem' }}>
            กำลังโหลดข้อมูล...
          </div>
          <div style={{ fontSize: '0.875rem', color: '#999' }}>
            กรุณารอสักครู่
          </div>
        </div>
      </div>
    );
  }

  if (!keyResult) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        padding: '2rem', 
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5'
      }}>
        <div>
          <div style={{ fontSize: '1.25rem', color: '#666', marginBottom: '1rem' }}>
            ไม่พบข้อมูล
          </div>
          <div style={{ fontSize: '0.875rem', color: '#999', marginBottom: '1.5rem' }}>
            ไม่สามารถโหลดข้อมูล Key Result ได้
          </div>
          <Link
            href={`/okrs/kr/${id}`}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#667eea',
              color: 'white',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              display: 'inline-block'
            }}
          >
            ← กลับไปหน้า Key Result
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Link
            href={`/okrs/kr/${id}`}
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

          {/* Header */}
          {keyResult.objective && (
            <div style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '1.5rem'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                Objective
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333', margin: 0 }}>
                {keyResult.objective.title}
              </h1>
              {keyResult.objective.description && (
                <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem', margin: 0 }}>
                  {keyResult.objective.description}
                </p>
              )}
            </div>
          )}

          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
              Key Result
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#333', margin: 0 }}>
              {keyResult.title}
            </h2>
            {keyResult.description && (
              <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem', margin: 0 }}>
                {keyResult.description}
              </p>
            )}
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#333', marginBottom: '1rem' }}>
            กำหนดค่าเป้าหมาย (Set Goal)
          </h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            กำหนดค่าเป้าหมายสำหรับแต่ละ Action ใน Key Result นี้
          </p>
        </div>

        {/* Actions List with Set Goal */}
        {keyResult.actions && keyResult.actions.length > 0 ? (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {keyResult.actions.map((action) => (
              <div
                key={action.id}
                style={{
                  background: 'white',
                  padding: '2rem',
                  borderRadius: '0.5rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      background: '#e0e7ff',
                      color: '#4338ca',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}>
                      #{action.order}
                    </span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333', margin: 0 }}>
                      {action.title}
                    </h3>
                  </div>
                  {action.description && (
                    <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
                      {action.description}
                    </p>
                  )}
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveGoal(action.id, actionGoals[action.id] ?? null);
                }}>
                  <StarRating
                    value={actionGoals[action.id] || 0}
                    onChange={(value) => {
                      setActionGoals(prev => ({
                        ...prev,
                        [action.id]: value,
                      }));
                    }}
                    label="ค่าเป้าหมาย สภาพที่คาดหมาย (Target Desired State) 1-5"
                  />

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="submit"
                      disabled={saving}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: saving ? '#ccc' : '#8b5cf6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        fontSize: '1rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {saving ? 'กำลังบันทึก...' : 'บันทึกค่าเป้าหมาย'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionGoals(prev => ({
                          ...prev,
                          [action.id]: null,
                        }));
                      }}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: '#e5e7eb',
                        color: '#333',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '1rem'
                      }}
                    >
                      ล้างค่า
                    </button>
                  </div>
                </form>

                {actionGoals[action.id] !== null && actionGoals[action.id] !== undefined && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    background: '#f0fdf4',
                    borderRadius: '0.5rem',
                    border: '1px solid #86efac',
                    fontSize: '0.875rem',
                    color: '#166534'
                  }}>
                    ✓ ค่าเป้าหมายที่ตั้งไว้: {actionGoals[action.id]}
                  </div>
                )}
              </div>
            ))}
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
            ยังไม่มี Actions สำหรับ Key Result นี้
          </div>
        )}

        {/* Save All Button */}
        {keyResult.actions && keyResult.actions.length > 0 && (
          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid #e5e7eb' }}>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              style={{
                padding: '0.75rem 2rem',
                background: saving ? '#ccc' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold',
                width: '100%'
              }}
            >
              {saving ? 'กำลังบันทึก...' : '💾 บันทึกค่าเป้าหมายทั้งหมด'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

