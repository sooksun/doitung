// app/okrs/actions/[id]/page.tsx
// Action detail page with Ratings

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError, toastConfirm } from '@/lib/toast';

interface ActionRating {
  id: number;
  currentState: number;
  desiredState: number;
  comment: string | null;
  evaluatedAt: string;
  evaluator?: {
    id: number;
    name: string;
    email: string;
  };
}

interface ActionDetails {
  id: number;
  title: string;
  description: string | null;
  targetDesiredState: number | null;
  objective?: {
    id: number;
    title: string;
    description: string | null;
    dimension: string | null;
  };
  keyResult?: {
    id: number;
    title: string;
    description: string | null;
  };
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

export default function ActionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [token, setToken] = useState<string | null>(null);
  const [actionDetails, setActionDetails] = useState<ActionDetails | null>(null);
  const [ratings, setRatings] = useState<ActionRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSetGoal, setShowSetGoal] = useState(false);
  const [formData, setFormData] = useState({
    currentState: 3,
    desiredState: 5,
    comment: '',
  });
  const [goalData, setGoalData] = useState({
    targetDesiredState: null as number | null,
  });
  const [editingRating, setEditingRating] = useState<ActionRating | null>(null);
  const [editFormData, setEditFormData] = useState({
    currentState: 3,
    desiredState: 5,
    comment: '',
  });
  const [currentUser, setCurrentUser] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/login');
      return;
    }
    setToken(storedToken);
    fetchCurrentUser(storedToken);
    if (id) {
      fetchActionDetails(storedToken, parseInt(id));
      fetchRatings(storedToken, parseInt(id));
    }
  }, [id, router]);

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setCurrentUser({ id: data.data.id, name: data.data.name });
        }
      }
    } catch (err) {
      console.error('Failed to fetch current user:', err);
    }
  };

  const fetchActionDetails = async (authToken: string, actionId: number) => {
    try {
      const res = await fetch(`/api/okrs/actions/${actionId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch action details');
      }

      const data = await res.json();
      if (data.success && data.data) {
        const action = data.data;
        setActionDetails({
          id: action.id,
          title: action.title,
          description: action.description,
          targetDesiredState: action.targetDesiredState,
          objective: action.objective,
          keyResult: action.keyResult,
        });
        setGoalData({
          targetDesiredState: action.targetDesiredState,
        });
        // Set default form values from goal if available
        if (action.targetDesiredState) {
          setFormData(prev => ({ ...prev, desiredState: action.targetDesiredState }));
        }
        // Set currentState from latest rating if available
        if (ratings.length > 0) {
          const latestRating = ratings[0]; // ratings are sorted by evaluatedAt desc
          setFormData(prev => ({ ...prev, currentState: latestRating.currentState }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRatings = async (authToken: string, actionId: number) => {
    try {
      const res = await fetch(`/api/okrs/actions/${actionId}/ratings`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch ratings');
      }

      const data = await res.json();
      const items = (data.success && data.data?.items) ? data.data.items : (Array.isArray(data) ? data : []);
      setRatings(items);
      // Update formData with latest rating if available
      if (items.length > 0) {
        const latestRating = items[0]; // ratings are sorted by evaluatedAt desc
        setFormData(prev => ({ ...prev, currentState: latestRating.currentState }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id) return;

    try {
      const res = await fetch(`/api/okrs/actions/${id}/ratings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setShowForm(false);
        setFormData({ 
          currentState: 3, 
          desiredState: actionDetails?.targetDesiredState || 5, 
          comment: '' 
        });
        fetchRatings(token, parseInt(id));
        toastSuccess('บันทึกการประเมินสำเร็จ');
      } else {
        toastError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      toastError('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  const handleSetGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id) return;

    try {
      const res = await fetch(`/api/okrs/actions/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetDesiredState: goalData.targetDesiredState }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setShowSetGoal(false);
        fetchActionDetails(token, parseInt(id));
        toastSuccess('บันทึกค่าเป้าหมายสำเร็จ');
      } else {
        toastError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      toastError('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  const handleEditRating = (rating: ActionRating) => {
    setEditingRating(rating);
    setEditFormData({
      currentState: rating.currentState,
      desiredState: rating.desiredState,
      comment: rating.comment || '',
    });
  };

  const handleUpdateRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id || !editingRating) return;

    try {
      const res = await fetch(`/api/okrs/actions/${id}/ratings/${editingRating.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setEditingRating(null);
        setEditFormData({ currentState: 3, desiredState: 5, comment: '' });
        fetchRatings(token, parseInt(id));
        toastSuccess('อัปเดตการประเมินสำเร็จ');
      } else {
        toastError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      toastError('เกิดข้อผิดพลาดในการอัปเดต');
    }
  };

  const handleDeleteRating = async (ratingId: number) => {
    if (!token || !id) return;

    toastConfirm(
      'คุณแน่ใจหรือไม่ว่าต้องการลบการประเมินนี้?',
      async () => {
        try {
          const res = await fetch(`/api/okrs/actions/${id}/ratings/${ratingId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          const data = await res.json();

          if (res.ok && data.success) {
            fetchRatings(token, parseInt(id));
            toastSuccess('ลบการประเมินสำเร็จ');
          } else {
            toastError(data.error || 'เกิดข้อผิดพลาด');
          }
        } catch (err) {
          toastError('เกิดข้อผิดพลาดในการลบ');
        }
      }
    );
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>กำลังโหลดข้อมูล...</div>;
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
          
          {/* Header: Objective, Key Result, Action with Progress Bar */}
          {actionDetails && (() => {
            // Get latest rating for progress calculation
            const latestRating = ratings.length > 0 ? ratings[0] : null;
            const targetDesiredState = actionDetails.targetDesiredState || 5;
            const currentState = latestRating?.currentState || 0;
            const progress = targetDesiredState > 0 ? (currentState / targetDesiredState) * 100 : 0;
            const progressPercent = Math.min(100, Math.max(0, progress));

            return (
              <div style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '0.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                marginBottom: '2rem'
              }}>
                {actionDetails.objective && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                      Objective
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333', margin: 0 }}>
                      {actionDetails.objective.title}
                    </h1>
                    {actionDetails.objective.description && (
                      <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem', margin: 0 }}>
                        {actionDetails.objective.description}
                      </p>
                    )}
                    {actionDetails.objective.dimension && (
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        background: '#e9d5ff',
                        color: '#7c3aed',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        marginTop: '0.5rem'
                      }}>
                        {actionDetails.objective.dimension}
                      </span>
                    )}
                  </div>
                )}
                
                {actionDetails.keyResult && (
                  <div style={{ marginBottom: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                      Key Result
                    </div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#333', margin: 0 }}>
                      {actionDetails.keyResult.title}
                    </h2>
                    {actionDetails.keyResult.description && (
                      <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem', margin: 0 }}>
                        {actionDetails.keyResult.description}
                      </p>
                    )}
                  </div>
                )}
                
                <div style={{ paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                    Key Action
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#333', margin: 0 }}>
                    {actionDetails.title}
                  </h3>
                  {actionDetails.description && (
                    <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem', margin: 0 }}>
                      {actionDetails.description}
                    </p>
                  )}
                </div>

                {/* Progress Bar */}
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#333' }}>
                      Progress
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#667eea' }}>
                      {progressPercent.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '1rem',
                    background: '#e5e7eb',
                    borderRadius: '0.5rem',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${progressPercent}%`,
                      height: '100%',
                      background: progressPercent >= 80 ? '#10b981' : progressPercent >= 50 ? '#f59e0b' : '#ef4444',
                      transition: 'width 0.3s ease',
                      borderRadius: '0.5rem'
                    }} />
                  </div>
                  {latestRating && (
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem', color: '#666' }}>
                      <span>สภาพที่เป็นอยู่: {latestRating.currentState} / 5</span>
                      <span>เป้าหมาย: {targetDesiredState} / 5</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333' }}>
              Action Ratings
            </h1>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setShowSetGoal(!showSetGoal)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                ⚙️ กำหนดค่าเป้าหมาย
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                + เพิ่มการประเมิน
              </button>
            </div>
          </div>
        </div>

        {/* Set Goal Form */}
        {showSetGoal && (
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '2rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#333' }}>
              กำหนดค่าเป้าหมาย (Set Goal)
            </h2>
            <form onSubmit={handleSetGoal}>
              <StarRating
                value={goalData.targetDesiredState || 0}
                onChange={(value) => setGoalData({ ...goalData, targetDesiredState: value })}
                label="ค่าเป้าหมาย สภาพที่คาดหมาย (Target Desired State) 1-5"
              />
              {ratings.length > 0 && (
                <div style={{
                  padding: '1rem',
                  background: '#f3f4f6',
                  borderRadius: '0.5rem',
                  marginBottom: '1rem',
                  fontSize: '0.875rem',
                  color: '#666'
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>ค่าเป้าหมาย สภาพที่เป็นอยู่ (Target Current State)</div>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#333' }}>
                    {ratings[0].currentState} / 5 (จากรายการประเมินล่าสุด)
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  บันทึกค่าเป้าหมาย
                </button>
                <button
                  type="button"
                  onClick={() => setShowSetGoal(false)}
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
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Rating Form */}
        {showForm && (
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '2rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#333' }}>
              เพิ่มการประเมิน Action
            </h2>
            
            {/* Display Goal if set */}
            {actionDetails?.targetDesiredState && (
              <div style={{
                padding: '1rem',
                background: '#fef3c7',
                borderRadius: '0.5rem',
                marginBottom: '1.5rem',
                border: '1px solid #fbbf24'
              }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400e', marginBottom: '0.5rem' }}>
                  ค่าเป้าหมายที่กำหนดไว้ (ไม่สามารถแก้ไขได้)
                </div>
                <div style={{ display: 'flex', gap: '2rem' }}>
                  {ratings.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>ค่าเป้าหมาย สภาพที่เป็นอยู่</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#92400e' }}>
                        {ratings[0].currentState} / 5 (จากรายการประเมินล่าสุด)
                      </div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>ค่าเป้าหมาย สภาพที่คาดหมาย</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#92400e' }}>
                      {actionDetails.targetDesiredState} / 5
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitRating}>
              <StarRating
                value={formData.currentState}
                onChange={(value) => setFormData({ ...formData, currentState: value })}
                label="สภาพที่เป็นอยู่ (Current State) 1-5"
              />

              <StarRating
                value={formData.desiredState}
                onChange={(value) => setFormData({ ...formData, desiredState: value })}
                label="สภาพที่คาดหมาย (Desired State) 1-5"
              />

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333' }}>
                  ความคิดเห็น (Comment)
                </label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  บันทึก
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
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
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Rating Form */}
        {editingRating && (
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '2rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#333' }}>
              แก้ไขการประเมิน
            </h2>
            <form onSubmit={handleUpdateRating}>
              <StarRating
                value={editFormData.currentState}
                onChange={(value) => setEditFormData({ ...editFormData, currentState: value })}
                label="สภาพที่เป็นอยู่ (Current State) 1-5"
              />

              <StarRating
                value={editFormData.desiredState}
                onChange={(value) => setEditFormData({ ...editFormData, desiredState: value })}
                label="สภาพที่คาดหมาย (Desired State) 1-5"
              />

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333' }}>
                  ความคิดเห็น (Comment)
                </label>
                <textarea
                  value={editFormData.comment}
                  onChange={(e) => setEditFormData({ ...editFormData, comment: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  บันทึกการแก้ไข
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRating(null);
                    setEditFormData({ currentState: 3, desiredState: 5, comment: '' });
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
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Ratings List */}
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#333' }}>
            การประเมินทั้งหมด ({ratings.length})
          </h2>

          {ratings.length > 0 ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {ratings.map((rating) => (
                <div
                  key={rating.id}
                  style={{
                    padding: '1.5rem',
                    background: '#f9fafb',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', flex: 1 }}>
                      <div>
                        <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                          สภาพที่เป็นอยู่
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>
                          {rating.currentState} / 5
                        </div>
                        {ratings.length > 0 && ratings[0].id === rating.id && (
                          <div style={{ fontSize: '0.75rem', color: '#8b5cf6', marginTop: '0.25rem' }}>
                            (ค่าเป้าหมาย สภาพที่เป็นอยู่)
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                          สภาพที่คาดหมาย
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>
                          {rating.desiredState} / 5
                        </div>
                        {actionDetails?.targetDesiredState && (
                          <div style={{ fontSize: '0.75rem', color: '#8b5cf6', marginTop: '0.25rem' }}>
                            เป้าหมาย: {actionDetails.targetDesiredState} / 5
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                          Gap
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: rating.desiredState - rating.currentState > 0 ? '#ef4444' : '#10b981' }}>
                          {rating.desiredState - rating.currentState}
                        </div>
                      </div>
                    </div>
                    {/* Edit/Delete Buttons - แสดงในทุก rating card */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                      {currentUser && rating.evaluator && rating.evaluator.id && currentUser.id === rating.evaluator.id ? (
                        <>
                          <button
                            onClick={() => handleEditRating(rating)}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#f59e0b',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.5rem',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            ✏️ แก้ไข
                          </button>
                          <button
                            onClick={() => handleDeleteRating(rating.id)}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.5rem',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            🗑️ ลบ
                          </button>
                        </>
                      ) : (
                        <div style={{
                          padding: '0.5rem 1rem',
                          background: '#e5e7eb',
                          color: '#9ca3af',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          whiteSpace: 'nowrap'
                        }}>
                          ไม่สามารถแก้ไขได้
                        </div>
                      )}
                    </div>
                  </div>

                  {rating.comment && (
                    <div style={{
                      padding: '0.75rem',
                      background: 'white',
                      borderRadius: '0.5rem',
                      marginBottom: '0.5rem',
                      fontSize: '0.9rem',
                      color: '#666'
                    }}>
                      💬 {rating.comment}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', color: '#666', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
                    <span>
                      ประเมินโดย: {rating.evaluator?.name || 'N/A'}
                    </span>
                    <span>
                      {new Date(rating.evaluatedAt).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>
              ยังไม่มีการประเมิน
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
