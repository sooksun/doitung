// app/components/IcebergInput.tsx
// Iceberg-Model 4-layer × 2-perspective input matrix.
// Used by /admin/sar/new and /admin/sar/[id] edit panel.
//
// Visual matches the workshop slide: a "STEP 4" arrow header, two coloured
// column pills (สิ่งที่เป็นอยู่ pink, สิ่งที่อยากให้เกิด teal), four horizontal
// layers cut by an iceberg silhouette, a red vertical centre line dividing
// the two perspectives, and the layer labels pulled out to the right column.
// Backwards-compatible with the previous data shape — only the labels and
// styling changed.

'use client';

import React from 'react';

// ─── Types ────────────────────────────────────────────────────────────────
export type IcebergLayer = { current: string; desired: string };
export type Iceberg = {
  situations: IcebergLayer;     // ชั้น 1 — ปรากฏการณ์ปัญหาของนักเรียน
  patterns: IcebergLayer;        // ชั้น 2 — แบบแผนพฤติกรรมของครู
  structures: IcebergLayer;      // ชั้น 3 — โครงสร้างระบบในโรงเรียน
  mentalModels: IcebergLayer;    // ชั้น 4 — ค่านิยมและคุณค่า
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
// Top to bottom (surface → depth). The labels are the workshop's framing
// ("ปรากฏการณ์ปัญหาของนักเรียน" instead of the old generic "1 · สถานการณ์")
// — they describe WHO the symptom belongs to at each depth: students at the
// surface, teacher behaviour just below, school structures deeper, then
// values/beliefs at the deepest layer.
export const ICEBERG_LAYERS: Array<{
  key: keyof Iceberg;
  label: string;
  sublabel: string;
  placeholderCurrent: string;
  placeholderDesired: string;
}> = [
  {
    key: 'situations',
    label: 'ปรากฏการณ์ปัญหาของนักเรียน',
    sublabel: 'สิ่งที่เห็นได้ในห้องเรียน/โรงเรียนตอนนี้',
    placeholderCurrent: 'เช่น เด็กขาดเรียนซ้ำ ๆ ผลสัมฤทธิ์ต่ำ พฤติกรรมก้าวร้าว',
    placeholderDesired: 'เช่น เด็กมาเรียนสม่ำเสมอ ผลสัมฤทธิ์ดี ใส่ใจการเรียน',
  },
  {
    key: 'patterns',
    label: 'แบบแผนพฤติกรรมของครู',
    sublabel: 'สิ่งที่ครูทำซ้ำ ๆ จนเป็นรูปแบบประจำ',
    placeholderCurrent: 'เช่น ครูสอนแบบบรรยาย ใช้เวลากับเอกสารมากกว่าห้องเรียน',
    placeholderDesired: 'เช่น ครูใช้ Active Learning เน้นนักเรียนเป็นศูนย์กลาง',
  },
  {
    key: 'structures',
    label: 'โครงสร้างระบบในโรงเรียน',
    sublabel: 'นโยบาย ระบบ ทรัพยากร ภาระงานที่ค้ำพฤติกรรมข้างบนไว้',
    placeholderCurrent: 'เช่น ภาระเอกสารมาก งบจำกัด ตารางสอนแน่น',
    placeholderDesired: 'เช่น มีระบบ PLC ตารางสอนยืดหยุ่น งบฯ พอเพียง',
  },
  {
    key: 'mentalModels',
    label: 'ค่านิยมและคุณค่า (ครู ผอ. ผู้ปกครอง)',
    sublabel: 'ความเชื่อ/ค่านิยมที่ฝังลึกของผู้ใหญ่รอบเด็ก',
    placeholderCurrent: 'เช่น "การประเมินเพื่อแสดงผลงาน" "เด็กชนบทเรียนได้แค่ระดับหนึ่ง"',
    placeholderDesired: 'เช่น "การประเมินเพื่อพัฒนา" "เด็กทุกคนมีศักยภาพไม่จำกัด"',
  },
];

// ─── Common visuals ───────────────────────────────────────────────────────
const TITLE_BAR_BG = '#22c2ad';        // teal arrow header
const PILL_PINK_BG = '#fbcfe8';        // "สิ่งที่เป็นอยู่" pill
const PILL_PINK_FG = '#831843';
const PILL_TEAL_BG = '#99f6e4';        // "สิ่งที่อยากให้เกิด" pill
const PILL_TEAL_FG = '#134e4a';
const RIGHT_LABEL_COL = '180px';
const ROW_GAP = '0.7rem';
const COL_GAP = '0.65rem';
const RED_LINE = '#dc2626';

function StepArrowTitle() {
  return (
    <div
      style={{
        display: 'inline-block',
        background: TITLE_BAR_BG,
        color: 'white',
        padding: '0.55rem 1.6rem 0.55rem 1rem',
        clipPath: 'polygon(0% 0%, 96% 0%, 100% 50%, 96% 100%, 0% 100%)',
        fontWeight: 700,
        fontSize: '0.92rem',
        marginBottom: '0.85rem',
        letterSpacing: '0.01em',
      }}
    >
      STEP 4 : วิเคราะห์ความซับซ้อนของสถานการณ์ปัญหา (ภูเขาน้ำแข็ง)
    </div>
  );
}

function ColumnPill({ kind, children }: { kind: 'pink' | 'teal'; children: React.ReactNode }) {
  const bg = kind === 'pink' ? PILL_PINK_BG : PILL_TEAL_BG;
  const fg = kind === 'pink' ? PILL_PINK_FG : PILL_TEAL_FG;
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <span
        style={{
          background: bg,
          color: fg,
          padding: '0.35rem 1.5rem',
          borderRadius: 4,
          fontWeight: 700,
          fontSize: '0.92rem',
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </span>
    </div>
  );
}

// Iceberg silhouette + red centre divider, drawn behind the textareas. The
// container is positioned to span columns 1 + 2 only (input area) and
// stretches to the full body height. The PNG asset has a transparent
// background so the textareas (white) read clearly on top of it.
function IcebergCurve() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        // Reach right up to the gutter before the right-side label column.
        right: `calc(${RIGHT_LABEL_COL} + ${COL_GAP})`,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {/* Iceberg image (transparent background). `contain` keeps the natural
          tall aspect of the iceberg drawing, centred horizontally — the
          textareas sit on top via the row grid's z-index 1. Mild opacity
          so cell text stays the primary signal. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/iceberg-underwater.png"
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          objectPosition: 'center',
          opacity: 0.55,
        }}
      />
      {/* Red vertical centre line dividing the two perspectives. */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '50%',
          width: 0,
          borderLeft: `1.5px solid ${RED_LINE}`,
          transform: 'translateX(-0.75px)',
        }}
      />
    </div>
  );
}

function RightSideLabel({ label, sublabel }: { label: string; sublabel: string }) {
  return (
    <div style={{ paddingLeft: '0.4rem' }}>
      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1f2937', lineHeight: 1.25 }}>
        {label}
      </div>
      {sublabel && (
        <div style={{ fontSize: '0.7rem', color: '#6b7280', lineHeight: 1.35, marginTop: 2 }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}

const TEXTAREA_BASE: React.CSSProperties = {
  width: '100%',
  minHeight: '78px',
  padding: '0.55rem 0.7rem',
  fontSize: '0.85rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.4rem',
  fontFamily: 'inherit',
  resize: 'vertical',
  lineHeight: 1.5,
  boxSizing: 'border-box',
  background: 'white',
};

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
  // /admin/sar/new and the SAR edit panel to attach the Sticky Notes button
  // to specific cells.
  renderCellAccessory?: (args: IcebergCellAccessoryArgs) => React.ReactNode;
}) {
  const setCell = (layer: keyof Iceberg, side: 'current' | 'desired', text: string) => {
    onChange({ ...value, [layer]: { ...value[layer], [side]: text } });
  };

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <StepArrowTitle />

      {/* Column header pills */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `1fr 1fr ${RIGHT_LABEL_COL}`,
          gap: COL_GAP,
          marginBottom: '0.6rem',
        }}
      >
        <ColumnPill kind="pink">📍 สิ่งที่เป็นอยู่</ColumnPill>
        <ColumnPill kind="teal">🎯 สิ่งที่อยากให้เกิด</ColumnPill>
        <div />
      </div>

      {/* Body: 4 layer rows × (current / desired / right-label) — with iceberg
          curve + red divider drawn behind cols 1+2. */}
      <div style={{ position: 'relative' }}>
        <IcebergCurve />
        {ICEBERG_LAYERS.map(({ key, label, sublabel, placeholderCurrent, placeholderDesired }, idx) => {
          const layerNo = (idx + 1) as 1 | 2 | 3 | 4;
          return (
            <div
              key={key}
              style={{
                display: 'grid',
                gridTemplateColumns: `1fr 1fr ${RIGHT_LABEL_COL}`,
                gap: COL_GAP,
                marginBottom: ROW_GAP,
                alignItems: 'center',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <CellWithAccessory accessory={renderCellAccessory?.({ layerKey: key, layerNo, side: 'current' })}>
                <textarea
                  value={value[key].current}
                  onChange={(e) => setCell(key, 'current', e.target.value)}
                  placeholder={placeholderCurrent}
                  style={TEXTAREA_BASE}
                />
              </CellWithAccessory>
              <CellWithAccessory accessory={renderCellAccessory?.({ layerKey: key, layerNo, side: 'desired' })}>
                <textarea
                  value={value[key].desired}
                  onChange={(e) => setCell(key, 'desired', e.target.value)}
                  placeholder={placeholderDesired}
                  style={{ ...TEXTAREA_BASE, background: '#fefce8', borderColor: '#facc15' }}
                />
              </CellWithAccessory>
              <RightSideLabel label={label} sublabel={sublabel} />
            </div>
          );
        })}
      </div>
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
// Matches the editable matrix's layout (curve + red divider + right-side
// labels) so a saved SAR document looks the same as the form that produced
// it.
export function IcebergDisplay({ value }: { value: Iceberg }) {
  return (
    <div>
      <StepArrowTitle />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `1fr 1fr ${RIGHT_LABEL_COL}`,
          gap: COL_GAP,
          marginBottom: '0.6rem',
        }}
      >
        <ColumnPill kind="pink">📍 สิ่งที่เป็นอยู่</ColumnPill>
        <ColumnPill kind="teal">🎯 สิ่งที่อยากให้เกิด</ColumnPill>
        <div />
      </div>

      <div style={{ position: 'relative' }}>
        <IcebergCurve />
        {ICEBERG_LAYERS.map(({ key, label, sublabel }) => (
          <div
            key={key}
            style={{
              display: 'grid',
              gridTemplateColumns: `1fr 1fr ${RIGHT_LABEL_COL}`,
              gap: COL_GAP,
              marginBottom: ROW_GAP,
              alignItems: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <ReadOnlyCell text={value[key].current} placeholder="—" />
            <ReadOnlyCell text={value[key].desired} placeholder="—" highlight />
            <RightSideLabel label={label} sublabel={sublabel} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadOnlyCell({ text, placeholder, highlight }: { text: string; placeholder: string; highlight?: boolean }) {
  if (!text || text.trim().length === 0) {
    return (
      <div style={{ padding: '0.55rem 0.7rem', fontSize: '0.85rem', color: '#9ca3af', fontStyle: 'italic' }}>
        {placeholder}
      </div>
    );
  }
  return (
    <div
      style={{
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        padding: '0.55rem 0.7rem',
        fontSize: '0.85rem',
        color: '#1f2937',
        lineHeight: 1.5,
        background: highlight ? '#fefce8' : '#f9fafb',
        borderRadius: '0.4rem',
        borderLeft: highlight ? '3px solid #eab308' : '3px solid #d1d5db',
      }}
    >
      {text}
    </div>
  );
}
