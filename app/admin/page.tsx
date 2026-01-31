'use client'

import Link from 'next/link'

export default function AdminPage() {
  const adminModules = [
    {
      title: 'จัดการผู้ใช้',
      description: 'เพิ่ม แก้ไข ลบ และจัดการสิทธิ์ผู้ใช้ในระบบ',
      icon: '👥',
      href: '/admin/users',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    },
    {
      title: 'จัดการโรงเรียน',
      description: 'จัดการข้อมูลโรงเรียนในระบบ',
      icon: '🏫',
      href: '/admin/schools',
      color: 'bg-green-50 hover:bg-green-100 border-green-200',
    },
    {
      title: 'โครงสร้างองค์กร',
      description: 'จัดการสำนักงานเขตและกลุ่มเครือข่าย',
      icon: '🏢',
      href: '/admin/structure',
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    },
    {
      title: 'จัดการตัวชี้วัด',
      description: 'จัดการตัวชี้วัดการประเมิน 47 ข้อ',
      icon: '📊',
      href: '/admin/indicators',
      color: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          ยินดีต้อนรับสู่ Admin Panel
        </h2>
        <p className="text-gray-600">
          จัดการและกำหนดค่าระบบประเมินคุณภาพสถานศึกษา
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {adminModules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className={`block p-6 border-2 rounded-lg transition-all ${module.color}`}
          >
            <div className="flex items-start">
              <div className="text-4xl mr-4">{module.icon}</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {module.title}
                </h3>
                <p className="text-sm text-gray-600">{module.description}</p>
                <div className="mt-4 text-primary-600 font-medium text-sm flex items-center">
                  เข้าจัดการ
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-12 bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">สถิติระบบ</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary-600">-</p>
            <p className="text-sm text-gray-600 mt-1">ผู้ใช้ทั้งหมด</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">-</p>
            <p className="text-sm text-gray-600 mt-1">โรงเรียน</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">-</p>
            <p className="text-sm text-gray-600 mt-1">การประเมิน</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-600">47</p>
            <p className="text-sm text-gray-600 mt-1">ตัวชี้วัด</p>
          </div>
        </div>
      </div>
    </div>
  )
}
