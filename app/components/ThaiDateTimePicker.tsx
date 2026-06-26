'use client';

// Thai DateTimePicker using antd DatePicker + dayjs buddhistEra plugin
// Displays and allows picking dates in Buddhist Era (พ.ศ.) with Thai locale
// Value in/out: ISO 8601 string (stored as Gregorian in DB, displayed as BE)

import React from 'react';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import 'dayjs/locale/th';
import { ConfigProvider, DatePicker } from 'antd';
import th_TH from 'antd/locale/th_TH';

dayjs.extend(buddhistEra);
dayjs.locale('th');

// BBBB = Buddhist Era 4-digit year (dayjs buddhistEra plugin)
const FORMAT_DATETIME = 'D MMM BBBB HH:mm';
const FORMAT_DATE = 'D MMM BBBB';

interface Props {
  value?: string | null;
  onChange: (isoString: string) => void;
  disabled?: boolean;
  showTime?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
}

export default function ThaiDateTimePicker({
  value,
  onChange,
  disabled = false,
  showTime = true,
  placeholder,
  style,
}: Props) {
  const dayjsVal: Dayjs | null = value ? dayjs(value) : null;
  const fmt = showTime ? FORMAT_DATETIME : FORMAT_DATE;

  return (
    <ConfigProvider locale={th_TH}>
      <DatePicker
        showTime={showTime ? { format: 'HH:mm' } : false}
        format={fmt}
        value={dayjsVal}
        onChange={(d: Dayjs | null) => onChange(d ? d.toISOString() : '')}
        disabled={disabled}
        placeholder={placeholder ?? (showTime ? 'เลือกวันเวลา' : 'เลือกวันที่')}
        allowClear
        style={{
          fontFamily: 'inherit',
          fontSize: '0.9rem',
          width: '100%',
          ...style,
        }}
      />
    </ConfigProvider>
  );
}

// Utility: format an ISO string → Thai BE string for display
export function formatThaiDate(iso: string | null | undefined, withTime = true): string {
  if (!iso) return '—';
  const d = dayjs(iso);
  return withTime ? d.format(FORMAT_DATETIME) : d.format(FORMAT_DATE);
}
