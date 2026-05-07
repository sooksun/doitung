// app/components/IcebergInput.tsx
// Iceberg-Model 4-layer × 2-perspective input matrix.
// Used by /admin/sar/new and /admin/sar/[id] edit panel.

'use client';

import React from 'react';

// ─── Types ────────────────────────────────────────────────────────────────
export type IcebergLayer = { current: string; desired: string };
export type Iceberg = {
  situations: IcebergLayer;     // ชั้น 1
  patterns: IcebergLayer;        // ชั้น 2
  structures: IcebergLayer;      // ชั้น 3
  mentalModels: IcebergLayer;    // ชั้น 4
};

export const EMPTY_ICEBERG: Iceberg = {
  situations: { current: '', desired: '' },
  patterns: { current: '', desired: '' },
  structures: { current: '', desired: '' },
  mentalModels: { current: '', desired: '' },
};

export function icebergHasContent(ic: Iceberg): boolean {
  return (
    ic.situations.current.trim().length > 0 ||
    ic.situations.desired.trim().length > 0 ||
    ic.patterns.current.trim().length > 0 ||
    ic.patterns.desired.trim().length > 0 ||
    ic.structures.current.trim().length > 0 ||
    ic.structures.desired.trim().length > 0 ||
    ic.mentalModels.current.trim().length > 0 ||
    ic.mentalModels.desired.trim().length > 0
  );
}

// Coerce server-side stored iceberg JSON into the strict Iceberg shape (handles
// legacy partial / undefined fields). Returns EMPTY_ICEBERG if input is null.
export function normalizeIceberg(raw: unknown): Iceberg {
  if (!raw || typeof raw !== 'object') return EMPTY_ICEBERG;
  const r = raw as Partial<Record<keyof Iceberg, Partial<IcebergLayer>>>;
  const layer = (k: keyof Iceberg): IcebergLayer => ({
    current: typeof r[k]?.current === 'string' ? (r[k]!.current as string) : '',
    desired: typeof r[k]?.desired === 'string' ? (r[k]!.desired as string) : '',
  });
  return {
    situations: layer('situations'),
    patterns: layer('patterns'),
    structures: layer('structures'),
    mentalModels: layer('mentalModels'),
  };
}

// ─── Layer config ─────────────────────────────────────────────────────────
// Top to bottom (surface → depth) with progressively darker blue accents,
// matching the rendering on /evaluations/:id/insights.
export const ICEBERG_LAYERS: Array<{
  key: keyof Iceberg;
  label: string;
  sublabel: string;
  bg: string;
  accent: string;
  placeholderCurrent: string;
  placeholderDesired: string;
}> = [
  {
    key: 'situations',
    label: '1 · สถานการณ์',
    sublabel: 'สิ่งที่เห็นเกิดขึ้นในโรงเรียน/บริบทสังคมตอนนี้',
    bg: '#eff6ff',
    accent: '#1d4ed8',
    placeholderCurrent: 'เช่น เด็กในชุมชนลดลง ขาดแคลนครู ผู้ปกครองทำงานนอกพื้นที่',
    placeholderDesired: 'เช่น ทุกห้องมีครูเพียงพอ ผู้ปกครองมีส่วนร่วม',
  },
  {
    key: 'patterns',
    label: '2 · รูปแบบของปัญหา',
    sublabel: 'อะไรเกิดซ้ำๆ จนกลายเป็นเทรนด์',
    bg: '#dbeafe',
    accent: '#1e40af',
    placeholderCurrent: 'เช่น เด็กขาดเรียนซ้ำในวันเปิดเทอม ครูทำเอกสารแทนสอน',
    placeholderDesired: 'เช่น เด็กมาเรียนสม่ำเสมอ ครูใช้เวลาส่วนใหญ่กับห้องเรียน',
  },
  {
    key: 'structures',
    label: '3 · โครงสร้าง',
    sublabel: 'นโยบาย ระบบ ทรัพยากร ภาระงานที่ค้ำรูปแบบไว้',
    bg: '#bfdbfe',
    accent: '#1e3a8a',
    placeholderCurrent: 'เช่น ภาระเอกสารมาก งบจำกัด ตารางสอนแน่น',
    placeholderDesired: 'เช่น มีระบบ PLC ตารางสอนยืดหยุ่น งบฯ พอเพียง',
  },
  {
    key: 'mentalModels',
    label: '4 · แบบจำลองวิธีคิด',
    sublabel: 'ความเชื่อ ค่านิยม ทัศนคติที่ฝังลึก',
    bg: '#93c5fd',
    accent: '#0c1a4d',
    placeholderCurrent: 'เช่น "การประเมินเพื่อแสดงผลงาน" "เด็กชนบทเรียนได้แค่ระดับหนึ่ง"',
    placeholderDesired: 'เช่น "การประเมินเพื่อพัฒนา" "เด็กทุกคนมีศักยภาพไม่จำกัด"',
  },
];

// ─── Editable matrix ──────────────────────────────────────────────────────
export type IcebergCellAccessoryArgs = {
  layerKey: keyof Iceberg;
  layerNo: 1 | 2 | 3 | 4;
  side: 'current' | 'desired';
};

export function IcebergInput({
  value,
  onChange,
  renderCellAccessory,
}: {
  value: Iceberg;
  onChange: (v: Iceberg) => void;
  // Optional slot rendered in the top-right corner of each textarea — used by
  // /admin/sar/new to attach the Sticky Notes button to specific cells without
  // forcing every caller (e.g. /admin/sar/[id]) to know about it.
  renderCellAccessory?: (args: IcebergCellAccessoryArgs) => React.ReactNode;
}) {
  const setCell = (layer: keyof Iceberg, side: 'current' | 'desired', text: string) => {
    onChange({ ...value, [layer]: { ...value[layer], [side]: text } });
  };
  const cellStyle: React.CSSProperties = {
    width: '100%',
    minHeight: '70px',
    padding: '0.5rem 0.65rem',
    fontSize: '0.85rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.35rem',
    fontFamily: 'inherit',
    resize: 'vertical',
    lineHeight: 1.5,
    boxSizing: 'border-box',
  };
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#333', marginBottom: '0.5rem' }}>
        🧊 Iceberg Analysis · 4 ชั้น × 2 ด้าน (ไม่บังคับครบทุกช่อง)
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '160px 1fr 1fr',
          gap: '0.4rem',
          fontSize: '0.72rem',
          fontWeight: 700,
          color: '#6b7280',
          marginBottom: '0.3rem',
          paddingLeft: '0.25rem',
        }}
      >
        <div></div>
        <div>📍 สิ่งที่เป็นอยู่</div>
        <div>🎯 สิ่งที่อยากให้เป็น</div>
      </div>
      {ICEBERG_LAYERS.map(({ key, label, sublabel, bg, accent, placeholderCurrent, placeholderDesired }, idx) => {
        const layerNo = (idx + 1) as 1 | 2 | 3 | 4;
        return (
          <div
            key={key}
            style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr 1fr',
              gap: '0.4rem',
              marginBottom: '0.4rem',
              alignItems: 'stretch',
            }}
          >
            <div style={{ background: bg, borderLeft: `4px solid ${accent}`, padding: '0.5rem 0.6rem', borderRadius: '0.25rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: accent }}>{label}</div>
              <div style={{ fontSize: '0.7rem', color: '#475569', lineHeight: 1.3 }}>{sublabel}</div>
            </div>
            <CellWithAccessory accessory={renderCellAccessory?.({ layerKey: key, layerNo, side: 'current' })}>
              <textarea
                value={value[key].current}
                onChange={(e) => setCell(key, 'current', e.target.value)}
                placeholder={placeholderCurrent}
                style={cellStyle}
              />
            </CellWithAccessory>
            <CellWithAccessory accessory={renderCellAccessory?.({ layerKey: key, layerNo, side: 'desired' })}>
              <textarea
                value={value[key].desired}
                onChange={(e) => setCell(key, 'desired', e.target.value)}
                placeholder={placeholderDesired}
                style={{ ...cellStyle, background: '#fefce8', borderColor: '#facc15' }}
              />
            </CellWithAccessory>
          </div>
        );
      })}
    </div>
  );
}

function CellWithAccessory({ children, accessory }: { children: React.ReactNode; accessory?: React.ReactNode }) {
  if (!accessory) return <>{children}</>;
  return (
    <div style={{ position: 'relative' }}>
      {children}
      <div style={{ position: 'absolute', top: 4, right: 6, zIndex: 2 }}>{accessory}</div>
    </div>
  );
}

// ─── Read-only display ────────────────────────────────────────────────────
export function IcebergDisplay({ value }: { value: Iceberg }) {
  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '160px 1fr 1fr',
          gap: '0.4rem',
          fontSize: '0.72rem',
          fontWeight: 700,
          color: '#6b7280',
          marginBottom: '0.3rem',
          paddingLeft: '0.25rem',
        }}
      >
        <div></div>
        <div>📍 สิ่งที่เป็นอยู่</div>
        <div>🎯 สิ่งที่อยากให้เป็น</div>
      </div>
      {ICEBERG_LAYERS.map(({ key, label, sublabel, bg, accent }) => (
        <div
          key={key}
          style={{
            display: 'grid',
            gridTemplateColumns: '160px 1fr 1fr',
            gap: '0.4rem',
            marginBottom: '0.4rem',
            alignItems: 'stretch',
          }}
        >
          <div style={{ background: bg, borderLeft: `4px solid ${accent}`, padding: '0.5rem 0.6rem', borderRadius: '0.25rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: accent }}>{label}</div>
            <div style={{ fontSize: '0.7rem', color: '#475569', lineHeight: 1.3 }}>{sublabel}</div>
          </div>
          <ReadOnlyCell text={value[key].current} placeholder="—" />
          <ReadOnlyCell text={value[key].desired} placeholder="—" highlight />
        </div>
      ))}
    </div>
  );
}

function ReadOnlyCell({ text, placeholder, highlight }: { text: string; placeholder: string; highlight?: boolean }) {
  if (!text || text.trim().length === 0) {
    return <div style={{ padding: '0.5rem 0.6rem', fontSize: '0.85rem', color: '#9ca3af', fontStyle: 'italic' }}>{placeholder}</div>;
  }
  return (
    <div
      style={{
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        padding: '0.5rem 0.6rem',
        fontSize: '0.85rem',
        color: '#1f2937',
        lineHeight: 1.5,
        background: highlight ? '#fefce8' : '#f9fafb',
        borderRadius: '0.35rem',
        borderLeft: highlight ? '3px solid #eab308' : '3px solid #d1d5db',
      }}
    >
      {text}
    </div>
  );
}
