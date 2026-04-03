// app/okrs/kr/[id]/page.tsx
// Key Result detail page with Actions and Ratings

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface OKRAction {
  id: number;
  title: string;
  description: string | null;
  order: number;
  status: string;
  averageCurrentState?: number;
  averageDesiredState?: number;
  ratingsCount?: number;
}

interface OKRKeyResult {
  id: number;
  title: string;
  description: string | null;
  baseline: number | null;
  target: number | null;
  current: number | null;
  progress?: number;
  status?: 'green' | 'yellow' | 'red';
  actions?: OKRAction[];
}

export default function KeyResultDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [token, setToken] = useState<string | null>(null);
  const [keyResult, setKeyResult] = useState<OKRKeyResult | null>(null);
  const [loading, setLoading] = useState(true);

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
      // Fetch KR details (need to get from objective first or create endpoint)
      // For now, fetch actions directly
      const actionsRes = await fetch(`/api/okrs/key-results/${krId}/actions`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (actionsRes.ok) {
        const actionsData = await actionsRes.json();
        const actions = Array.isArray(actionsData) ? actionsData : (actionsData.success ? actionsData.data : []);
        
        // Create a mock KR object for display
        setKeyResult({
          id: krId,
          title: 'Key Result',
          description: null,
          baseline: null,
          target: null,
          current: null,
          actions: actions,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      'PENDING': { bg: '#fef3c7', text: '#92400e' },
      'IN_PROGRESS': { bg: '#dbeafe', text: '#1e40af' },
      'COMPLETED': { bg: '#d1fae5', text: '#065f46' },
      'CANCELLED': { bg: '#fee2e2', text: '#991b1b' },
      'ON_HOLD': { bg: '#e5e7eb', text: '#374151' },
    };
    return colors[status] || { bg: '#f3f4f6', text: '#6b7280' };
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'PENDING': 'รอดำเนินการ',
      'IN_PROGRESS': 'กำลังดำเนินการ',
      'COMPLETED': 'เสร็จสิ้น',
      'CANCELLED': 'ยกเลิก',
      'ON_HOLD': 'พักไว้',
    };
    return labels[status] || status;
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>กำลังโหลดข้อมูล...</div>;
  }

  if (!keyResult) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>ไม่พบข้อมูล</div>;
  }

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Link
            href="/okrs"
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333', marginBottom: '0.5rem' }}>
                {keyResult.title}
              </h1>
              {keyResult.description && (
                <p style={{ color: '#666', marginBottom: '0.5rem' }}>{keyResult.description}</p>
              )}
            </div>
            <Link
              href={`/okrs/kr/${id}/set-goal`}
              style={{
                padding: '0.5rem 1rem',
                background: '#8b5cf6',
                color: 'white',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 'bold'
              }}
            >
              ⚙️ กำหนดค่าเป้าหมาย
            </Link>
          </div>
        </div>

        {/* Actions */}
        {keyResult.actions && keyResult.actions.length > 0 ? (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#333' }}>
              Actions ({keyResult.actions.length})
            </h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {keyResult.actions.map((action) => {
                const statusColor = getStatusColor(action.status);
                return (
                  <div
                    key={action.id}
                    style={{
                      background: 'white',
                      padding: '1.5rem',
                      borderRadius: '0.5rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div style={{ flex: 1 }}>
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
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333' }}>
                            {action.title}
                          </h3>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            background: statusColor.bg,
                            color: statusColor.text,
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem'
                          }}>
                            {getStatusLabel(action.status)}
                          </span>
                        </div>
                        {action.description && (
                          <p style={{ color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                            {action.description}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/okrs/actions/${action.id}`}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#667eea',
                          color: 'white',
                          borderRadius: '0.5rem',
                          textDecoration: 'none',
                          fontSize: '0.875rem'
                        }}
                      >
                        ดู Ratings
                      </Link>
                    </div>

                    {/* Ratings Summary */}
                    {(action.averageCurrentState !== undefined || action.averageDesiredState !== undefined) && (
                      <div style={{
                        padding: '1rem',
                        background: '#f9fafb',
                        borderRadius: '0.5rem',
                        marginTop: '0.5rem'
                      }}>
                        <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                          การประเมิน (Average)
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          {action.averageCurrentState !== undefined && (
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>
                                สภาพที่เป็นอยู่
                              </div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#333' }}>
                                {action.averageCurrentState.toFixed(1)} / 5.0
                              </div>
                            </div>
                          )}
                          {action.averageDesiredState !== undefined && (
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>
                                สภาพที่คาดหมาย
                              </div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#333' }}>
                                {action.averageDesiredState.toFixed(1)} / 5.0
                              </div>
                            </div>
                          )}
                        </div>
                        {action.ratingsCount !== undefined && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#666' }}>
                            จำนวนการประเมิน: {action.ratingsCount}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
            ยังไม่มี Actions
          </div>
        )}
      </div>
    </div>
  );
}

