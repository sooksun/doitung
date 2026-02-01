'use client'

interface Indicator {
  id: string
  code: string
  title: string
  orderNo: number
}

interface ResponseData {
  indicatorId: string
  score: number
  desiredScore?: number
  note?: string
}

interface GroupRatingTableProps {
  group: {
    id: string
    code: string
    name: string
    nameEn?: string
    indicators: Indicator[]
  }
  responses: Map<string, ResponseData>
  onChange: (indicatorId: string, score: number, desiredScore: number | undefined, note: string) => void
  disabled?: boolean
}

export default function GroupRatingTable({
  group,
  responses,
  onChange,
  disabled = false,
}: GroupRatingTableProps) {
  const scoreOptions = [5, 4, 3, 2, 1]

  const handleScoreChange = (indicatorId: string, score: number, type: 'current' | 'desired') => {
    const existingResponse = responses.get(indicatorId)
    if (type === 'current') {
      onChange(indicatorId, score, existingResponse?.desiredScore, existingResponse?.note || '')
    } else {
      onChange(indicatorId, existingResponse?.score || 0, score, existingResponse?.note || '')
    }
  }

  const getAnsweredCount = () => {
    // Count indicators where both scores are answered
    return group.indicators.filter((ind) => {
      const response = responses.get(ind.id)
      return response && response.score > 0 && response.desiredScore && response.desiredScore > 0
    }).length
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
      {/* Group Header */}
      <div className="bg-gradient-to-r from-purple-100 to-blue-100 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              ตัวชี้วัดด้าน {group.name} <span className="text-red-500">*</span>
            </h2>
          </div>
          <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full shadow-sm">
            ตอบแล้ว {getAnsweredCount()}/{group.indicators.length}
          </div>
        </div>
      </div>

      {/* Rating Table */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          {/* Header Rows */}
          <thead className="sticky top-0 z-10">
            {/* Category Header Row */}
            <tr className="border-b border-gray-200">
              <th rowSpan={2} className="text-left px-3 py-3 text-sm font-medium text-gray-700 border-r border-gray-200 bg-gray-100 overflow-hidden" style={{ width: '50%' }}>
                ตัวชี้วัด
              </th>
              <th colSpan={5} className="text-center px-1 py-2 text-xs font-bold text-purple-800 border-r-2 border-purple-300 bg-purple-200">
                ประเมินสภาพที่เป็นอยู่
              </th>
              <th colSpan={5} className="text-center px-1 py-2 text-xs font-bold text-blue-800 bg-blue-200">
                ประเมินสภาพที่พึงประสงค์
              </th>
            </tr>
            {/* Score Header Row */}
            <tr className="border-b border-gray-200">
              {/* Current State Scores */}
              {scoreOptions.map((score, idx) => (
                <th
                  key={`current-${score}`}
                  className={`text-center px-1 py-2 text-sm font-bold text-purple-800 bg-purple-100 ${idx === 4 ? 'border-r-2 border-purple-300' : 'border-r border-purple-200'}`}
                  style={{ width: '5.5%' }}
                >
                  {score}
                </th>
              ))}
              {/* Desired State Scores */}
              {scoreOptions.map((score, idx) => (
                <th
                  key={`desired-${score}`}
                  className={`text-center px-1 py-2 text-sm font-bold text-blue-800 bg-blue-100 ${idx < 4 ? 'border-r border-blue-200' : ''}`}
                  style={{ width: '5.5%' }}
                >
                  {score}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body Rows */}
          <tbody>
            {group.indicators.map((indicator) => {
              const currentResponse = responses.get(indicator.id)
              const hasBothScores = currentResponse?.score && currentResponse?.desiredScore

              return (
                <tr
                  key={indicator.id}
                  className={`
                    border-b border-gray-100 transition-colors
                    ${hasBothScores ? 'ring-1 ring-inset ring-green-200' : ''}
                  `}
                >
                  {/* Indicator Title */}
                  <td className="px-3 py-3 text-sm text-gray-700 leading-relaxed border-r border-gray-200 overflow-hidden">
                    <div className="flex items-start gap-2 max-w-full">
                      {hasBothScores && (
                        <span className="flex-shrink-0 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs mt-0.5">
                          ✓
                        </span>
                      )}
                      <span className={`break-words overflow-hidden ${hasBothScores ? 'text-gray-900 font-medium' : ''}`}>
                        {indicator.title}
                      </span>
                    </div>
                  </td>

                  {/* Current State Radio Buttons - Purple background */}
                  {scoreOptions.map((score, idx) => (
                    <td 
                      key={`current-${score}`} 
                      className={`text-center px-1 py-3 bg-purple-50 ${idx === 4 ? 'border-r-2 border-purple-300' : 'border-r border-purple-100'}`}
                    >
                      <label
                        className={`
                          inline-flex items-center justify-center w-6 h-6 rounded-full border-2 cursor-pointer
                          transition-all duration-200 ease-in-out
                          ${
                            currentResponse?.score === score
                              ? 'border-purple-600 bg-purple-600 shadow-lg scale-110'
                              : 'border-purple-300 hover:border-purple-500 hover:bg-purple-100 bg-white'
                          }
                          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <input
                          type="radio"
                          name={`current-${indicator.id}`}
                          value={score}
                          checked={currentResponse?.score === score}
                          onChange={() => handleScoreChange(indicator.id, score, 'current')}
                          disabled={disabled}
                          className="sr-only"
                        />
                        {currentResponse?.score === score && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </label>
                    </td>
                  ))}

                  {/* Desired State Radio Buttons - Blue background */}
                  {scoreOptions.map((score, idx) => (
                    <td 
                      key={`desired-${score}`} 
                      className={`text-center px-1 py-3 bg-blue-50 ${idx < 4 ? 'border-r border-blue-100' : ''}`}
                    >
                      <label
                        className={`
                          inline-flex items-center justify-center w-6 h-6 rounded-full border-2 cursor-pointer
                          transition-all duration-200 ease-in-out
                          ${
                            currentResponse?.desiredScore === score
                              ? 'border-blue-600 bg-blue-600 shadow-lg scale-110'
                              : 'border-blue-300 hover:border-blue-500 hover:bg-blue-100 bg-white'
                          }
                          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <input
                          type="radio"
                          name={`desired-${indicator.id}`}
                          value={score}
                          checked={currentResponse?.desiredScore === score}
                          onChange={() => handleScoreChange(indicator.id, score, 'desired')}
                          disabled={disabled}
                          className="sr-only"
                        />
                        {currentResponse?.desiredScore === score && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </label>
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Legend */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-green-600">5</span>
            <span>= ดีมาก</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-blue-600">4</span>
            <span>= ดี</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-yellow-600">3</span>
            <span>= ปานกลาง</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-orange-600">2</span>
            <span>= พอใช้</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-red-600">1</span>
            <span>= ปรับปรุง</span>
          </div>
        </div>
        <div className="flex justify-center gap-8 mt-3 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-600"></div>
            <span>สภาพที่เป็นอยู่</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-600"></div>
            <span>สภาพที่พึงประสงค์</span>
          </div>
        </div>
      </div>
    </div>
  )
}
