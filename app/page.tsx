import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-primary-50 to-secondary-50">
      <div className="text-center space-y-8">
        <h1 className="text-6xl font-bold text-primary-700">
          EQAP
        </h1>
        <p className="text-2xl text-gray-700">
          EduQuality Assessment Platform
        </p>
        <p className="text-lg text-gray-600">
          ระบบประเมินคุณภาพสถานศึกษา
        </p>
        
        <div className="flex gap-4 justify-center mt-8">
          <Link
            href="/login"
            className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            เข้าสู่ระบบ
          </Link>
          <Link
            href="/signup"
            className="px-8 py-3 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition-colors font-medium"
          >
            ลงทะเบียน
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-primary-700 mb-2">
              📊 Dashboard
            </h3>
            <p className="text-gray-600 text-sm">
              ดูภาพรวมและสถิติการประเมินแบบ Real-time
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-primary-700 mb-2">
              📝 Assessment
            </h3>
            <p className="text-gray-600 text-sm">
              ประเมินคุณภาพ 47 ตัวชี้วัด พร้อม Auto-save
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-primary-700 mb-2">
              📈 Reports
            </h3>
            <p className="text-gray-600 text-sm">
              รายงาน Radar Graph และเปรียบเทียบหลายปี
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
