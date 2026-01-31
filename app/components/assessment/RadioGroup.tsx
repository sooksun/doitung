interface RadioGroupProps {
  value: number | null
  onChange: (value: number) => void
  disabled?: boolean
}

export default function RadioGroup({ value, onChange, disabled = false }: RadioGroupProps) {
  const options = [
    { value: 1, label: '1', color: 'text-red-600 border-red-600' },
    { value: 2, label: '2', color: 'text-orange-600 border-orange-600' },
    { value: 3, label: '3', color: 'text-yellow-600 border-yellow-600' },
    { value: 4, label: '4', color: 'text-blue-600 border-blue-600' },
    { value: 5, label: '5', color: 'text-green-600 border-green-600' },
  ]

  return (
    <div className="flex gap-3">
      {options.map((option) => (
        <label
          key={option.value}
          className={`
            flex items-center justify-center w-12 h-12 rounded-full border-2 cursor-pointer
            transition-all font-medium text-lg
            ${value === option.value 
              ? `${option.color} bg-opacity-10` 
              : 'border-gray-300 text-gray-500 hover:border-gray-400'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            type="radio"
            name="score"
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            disabled={disabled}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  )
}
