interface NoteInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export default function NoteInput({ 
  value, 
  onChange, 
  placeholder = 'เพิ่มหมายเหตุหรือรายละเอียดเพิ่มเติม...',
  disabled = false 
}: NoteInputProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        หมายเหตุ (ถ้ามี)
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={3}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
      />
    </div>
  )
}
