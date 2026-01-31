import { DashboardStats } from '@/lib/types'

interface SummaryCardsProps {
  stats: DashboardStats
}

export default function SummaryCards({ stats }: SummaryCardsProps) {
  const cards = [
    {
      title: 'แบบประเมินทั้งหมด',
      value: stats.totalAssessments,
      icon: '📋',
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'ส่งแล้ว',
      value: stats.completedAssessments,
      icon: '✅',
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'ร่าง / กำลังทำ',
      value: stats.draftAssessments,
      icon: '📝',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'คะแนนเฉลี่ย',
      value: stats.averageScore.toFixed(2),
      suffix: ' / 5.00',
      icon: '⭐',
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-2">{card.title}</p>
              <p className={`text-3xl font-bold ${card.textColor}`}>
                {card.value}
                {card.suffix && (
                  <span className="text-lg font-normal text-gray-500">{card.suffix}</span>
                )}
              </p>
            </div>
            <div className={`text-4xl ${card.bgColor} w-16 h-16 rounded-full flex items-center justify-center`}>
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
