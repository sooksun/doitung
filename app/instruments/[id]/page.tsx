// app/instruments/[id]/page.tsx
// Instrument detail page

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError, toastConfirm, toastWarning } from '@/lib/toast';

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
  }>;
}

interface Instrument {
  id: number;
  code: string;
  nameTh: string;
  nameEn: string | null;
  type: string;
  sections: Section[];
}

interface SectionFormData {
  nameTh: string;
  nameEn: string;
  description: string;
  order: number;
}

export default function InstrumentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [token, setToken] = useState<string | null>(null);
  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [formData, setFormData] = useState<SectionFormData>({
    nameTh: '',
    nameEn: '',
    description: '',
    order: 1,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      router.push('/login');
      return;
    }
    setToken(storedToken);
    if (id) {
      fetchInstrument(storedToken, parseInt(id));
    }
  }, [id, router]);

  const fetchInstrument = async (authToken: string, instrumentId: number) => {
    try {
      const res = await fetch(`/api/instruments/${instrumentId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch instrument');
      }

      const data = await res.json();
      
      // Ensure sections is always an array
      if (data && !Array.isArray(data.sections)) {
        data.sections = [];
      }
      
      // Ensure each section has indicators array
      if (data && data.sections) {
        data.sections = data.sections.map((section: Section) => ({
          ...section,
          indicators: Array.isArray(section.indicators) ? section.indicators : [],
        }));
      }
      
      setInstrument(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSection = async () => {
    if (!token || !id) return;

    if (!formData.nameTh.trim()) {
      toastWarning('กรุณากรอกชื่อ Section (ภาษาไทย)');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/instruments/${id}/sections`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        toastError(data.error || 'เกิดข้อผิดพลาดในการสร้าง Section');
        return;
      }

      // Reset form and refresh
      setFormData({ nameTh: '', nameEn: '', description: '', order: 1 });
      setShowCreateForm(false);
      toastSuccess('สร้าง Section สำเร็จ');
      if (token) {
        fetchInstrument(token, parseInt(id));
      }
    } catch (err) {
      console.error(err);
      toastError('เกิดข้อผิดพลาดในการสร้าง Section');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSection = (section: Section) => {
    setEditingSection(section);
    setFormData({
      nameTh: section.nameTh,
      nameEn: section.nameEn || '',
      description: '',
      order: section.order,
    });
    setShowCreateForm(true);
  };

  const handleUpdateSection = async () => {
    if (!token || !id || !editingSection) return;

    if (!formData.nameTh.trim()) {
      toastWarning('กรุณากรอกชื่อ Section (ภาษาไทย)');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/instruments/${id}/sections/${editingSection.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        toastError(data.error || 'เกิดข้อผิดพลาดในการอัปเดต Section');
        return;
      }

      // Reset form and refresh
      setFormData({ nameTh: '', nameEn: '', description: '', order: 1 });
      setShowCreateForm(false);
      setEditingSection(null);
      toastSuccess('อัปเดต Section สำเร็จ');
      if (token) {
        fetchInstrument(token, parseInt(id));
      }
    } catch (err) {
      console.error(err);
      toastError('เกิดข้อผิดพลาดในการอัปเดต Section');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSection = async (sectionId: number) => {
    if (!token || !id) return;

    const ok = await toastConfirm('คุณแน่ใจหรือไม่ว่าต้องการลบ Section นี้?');
    if (!ok) return;

    try {
      const res = await fetch(`/api/instruments/${id}/sections/${sectionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        toastError(data.error || 'เกิดข้อผิดพลาดในการลบ Section');
        return;
      }

      // Refresh
      toastSuccess('ลบ Section สำเร็จ');
      fetchInstrument(token, parseInt(id));
    } catch (err) {
      console.error(err);
      toastError('เกิดข้อผิดพลาดในการลบ Section');
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>กำลังโหลดข้อมูล...</div>;
  }

  if (!instrument) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>ไม่พบข้อมูล</div>;
  }

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Link
            href="/instruments"
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
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#333' }}>
            {instrument.nameTh}
          </h1>
          {instrument.nameEn && (
            <p style={{ color: '#666', marginTop: '0.5rem' }}>{instrument.nameEn}</p>
          )}
        </div>

        {/* Create/Edit Section Form */}
        {showCreateForm && (
          <div
            style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '1.5rem'
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#333' }}>
              {editingSection ? 'แก้ไข Section' : 'สร้าง Section ใหม่'}
            </h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333' }}>
                  ชื่อ Section (ภาษาไทย) <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.nameTh}
                  onChange={(e) => setFormData({ ...formData, nameTh: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                  placeholder="เช่น Q-Leadership: ภาวะผู้นำทางวิชาการ"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333' }}>
                  ชื่อ Section (ภาษาอังกฤษ)
                </label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                  placeholder="เช่น Q-Leadership"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333' }}>
                  คำอธิบาย
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                  placeholder="คำอธิบายเพิ่มเติม (ถ้ามี)"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#333' }}>
                  ลำดับ (Order)
                </label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                  min="1"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingSection(null);
                    setFormData({ nameTh: '', nameEn: '', description: '', order: 1 });
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
                <button
                  onClick={editingSection ? handleUpdateSection : handleCreateSection}
                  disabled={submitting}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    opacity: submitting ? 0.6 : 1
                  }}
                >
                  {submitting ? 'กำลังบันทึก...' : editingSection ? 'อัปเดต' : 'สร้าง'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sections List */}
        {instrument.sections && Array.isArray(instrument.sections) && instrument.sections.length > 0 ? (
          instrument.sections.map((section) => (
          <div
            key={section.id}
            style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '0.5rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '1.5rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#333', margin: 0 }}>
                {section.nameTh}
                {section.nameEn && (
                  <span style={{ fontSize: '0.9rem', color: '#666', marginLeft: '0.5rem' }}>
                    ({section.nameEn})
                  </span>
                )}
                <span style={{ fontSize: '0.875rem', color: '#666', marginLeft: '0.5rem', fontWeight: 'normal' }}>
                  (ลำดับ: {section.order})
                </span>
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleEditSection(section)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  แก้ไข
                </button>
                <button
                  onClick={() => handleDeleteSection(section.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  ลบ
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {section.indicators && Array.isArray(section.indicators) && section.indicators.length > 0 ? (
                section.indicators.map((indicator) => (
                <div
                  key={indicator.id}
                  style={{
                    padding: '1rem',
                    background: '#f9fafb',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'start' }}>
                    {indicator.itemCode && (
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: '#e0e7ff',
                        color: '#4338ca',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                        minWidth: '60px',
                        textAlign: 'center'
                      }}>
                        {indicator.itemCode}
                      </span>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#333', marginBottom: '0.25rem' }}>
                        {indicator.textTh}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#666' }}>
                        Scale: {indicator.scaleType}
                      </div>
                    </div>
                  </div>
                </div>
                ))
              ) : (
                <div style={{ padding: '1rem', textAlign: 'center', color: '#666', fontSize: '0.875rem' }}>
                  ยังไม่มี Indicators ใน section นี้
                </div>
              )}
            </div>
          </div>
          ))
        ) : (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            color: '#666'
          }}>
            <p style={{ marginBottom: '1rem' }}>ยังไม่มี Sections สำหรับ instrument นี้</p>
            {!showCreateForm && (
              <button
                onClick={() => setShowCreateForm(true)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                + สร้าง Section ใหม่
              </button>
            )}
          </div>
        )}

        {/* Add Section Button (when sections exist) */}
        {instrument.sections && Array.isArray(instrument.sections) && instrument.sections.length > 0 && !showCreateForm && (
          <div style={{ marginTop: '1rem' }}>
            <button
              onClick={() => {
                setEditingSection(null);
                setFormData({ nameTh: '', nameEn: '', description: '', order: (instrument.sections?.length || 0) + 1 });
                setShowCreateForm(true);
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              + สร้าง Section ใหม่
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

