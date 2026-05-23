// app/live-dashboard/components/ScopeSelector.tsx
// Scope filter: school | network | district + year/term selectors

'use client';

interface School {
  id: number;
  nameTh: string;
}
interface Network {
  id: number;
  name: string;
}
interface AcademicYear {
  id: number;
  year: string;
}
interface Term {
  id: number;
  termNumber: number;
  academicYearId: number;
}
interface Instrument {
  id: number;
  nameTh: string;
}

interface ScopeSelectorProps {
  scope: 'school' | 'network' | 'district';
  schoolId?: number;
  networkId?: number;
  academicYearId?: number;
  termId?: number;
  instrumentId?: number;
  schools: School[];
  networks: Network[];
  academicYears: AcademicYear[];
  terms: Term[];
  instruments: Instrument[];
  onScopeChange: (scope: 'school' | 'network' | 'district') => void;
  onSchoolChange: (id?: number) => void;
  onNetworkChange: (id?: number) => void;
  onYearChange: (id?: number) => void;
  onTermChange: (id?: number) => void;
  onInstrumentChange: (id?: number) => void;
}

const selectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  color: '#e2e8f0',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: '0.4rem',
  padding: '0.35rem 0.75rem',
  fontSize: '0.85rem',
  fontFamily: 'Kanit, sans-serif',
  cursor: 'pointer',
  outline: 'none',
  minWidth: '140px',
};

// Native <option> popup uses the OS/browser surface, not the dark dashboard
// background — explicitly set black-on-white so the list is readable when open.
const optionStyle: React.CSSProperties = {
  color: '#000',
  background: '#fff',
};

const btnBase: React.CSSProperties = {
  padding: '0.4rem 1rem',
  borderRadius: '0.4rem',
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.85rem',
  fontFamily: 'Kanit, sans-serif',
  fontWeight: 600,
  transition: 'all 0.15s',
};

export default function ScopeSelector({
  scope,
  schoolId,
  networkId,
  academicYearId,
  termId,
  instrumentId,
  schools,
  networks,
  academicYears,
  terms,
  instruments,
  onScopeChange,
  onSchoolChange,
  onNetworkChange,
  onYearChange,
  onTermChange,
  onInstrumentChange,
}: ScopeSelectorProps) {
  const filteredTerms = academicYearId
    ? terms.filter((t) => t.academicYearId === academicYearId)
    : terms;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        alignItems: 'center',
      }}
    >
      {/* Instrument (assessment tool) selector */}
      {instruments.length > 0 && (
        <select
          value={instrumentId ?? ''}
          onChange={(e) => onInstrumentChange(e.target.value ? parseInt(e.target.value) : undefined)}
          style={{ ...selectStyle, minWidth: '200px', fontWeight: 600 }}
          title="เลือกเครื่องมือประเมิน"
        >
          {instruments.map((inst) => (
            <option key={inst.id} value={inst.id} style={optionStyle}>
              {inst.nameTh}
            </option>
          ))}
        </select>
      )}

      {/* Scope buttons */}
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {(['school', 'network', 'district'] as const).map((s) => {
          const label = s === 'school' ? 'รายโรงเรียน' : s === 'network' ? 'กลุ่มโรงเรียน' : 'เขตพื้นที่';
          const active = scope === s;
          return (
            <button
              key={s}
              onClick={() => onScopeChange(s)}
              style={{
                ...btnBase,
                background: active ? '#818cf8' : 'rgba(255,255,255,0.1)',
                color: active ? '#fff' : '#cbd5e1',
                boxShadow: active ? '0 0 10px #818cf880' : 'none',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Conditional dropdowns */}
      {scope === 'school' && (
        <select
          value={schoolId ?? ''}
          onChange={(e) => onSchoolChange(e.target.value ? parseInt(e.target.value) : undefined)}
          style={selectStyle}
        >
          <option value="" style={optionStyle}>-- เลือกโรงเรียน --</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id} style={optionStyle}>
              {s.nameTh}
            </option>
          ))}
        </select>
      )}

      {scope === 'network' && (
        <select
          value={networkId ?? ''}
          onChange={(e) => onNetworkChange(e.target.value ? parseInt(e.target.value) : undefined)}
          style={selectStyle}
        >
          <option value="" style={optionStyle}>-- เลือกกลุ่มโรงเรียน --</option>
          {networks.map((n) => (
            <option key={n.id} value={n.id} style={optionStyle}>
              {n.name}
            </option>
          ))}
        </select>
      )}

      {/* Year filter */}
      <select
        value={academicYearId ?? ''}
        onChange={(e) => {
          onYearChange(e.target.value ? parseInt(e.target.value) : undefined);
          onTermChange(undefined);
        }}
        style={selectStyle}
      >
        <option value="" style={optionStyle}>ทุกปีการศึกษา</option>
        {academicYears.map((y) => (
          <option key={y.id} value={y.id} style={optionStyle}>
            ปีการศึกษา {y.year}
          </option>
        ))}
      </select>

      {/* Term filter */}
      {academicYearId && filteredTerms.length > 0 && (
        <select
          value={termId ?? ''}
          onChange={(e) => onTermChange(e.target.value ? parseInt(e.target.value) : undefined)}
          style={selectStyle}
        >
          <option value="" style={optionStyle}>ทุกเทอม</option>
          {filteredTerms.map((t) => (
            <option key={t.id} value={t.id} style={optionStyle}>
              เทอม {t.termNumber}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
