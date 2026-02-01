'use client'

import { useState, useEffect } from 'react'
import DataTable from '@/components/admin/DataTable'
import Modal from '@/components/admin/Modal'
import FormField from '@/components/admin/FormField'
import { showSuccess, showError, confirmAction } from '@/lib/toast'

interface UserRow extends Record<string, unknown> {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  isActive?: boolean
  office?: { id: string; name?: string }
  network?: { id: string; name?: string }
  school?: { id: string; name?: string }
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: '',
    officeId: '',
    networkId: '',
    schoolId: '',
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setUsers(data.data.users)
      }
    } catch (error) {
      console.error('Fetch users error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setModalMode('create')
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: '',
      officeId: '',
      networkId: '',
      schoolId: '',
    })
    setIsModalOpen(true)
  }

  const handleEdit = (user: UserRow) => {
    setModalMode('edit')
    setSelectedUser(user)
    setFormData({
      email: user.email,
      password: '',
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      officeId: user.office?.id || '',
      networkId: user.network?.id || '',
      schoolId: user.school?.id || '',
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (user: UserRow) => {
    const confirmed = await confirmAction(
      `คุณต้องการลบผู้ใช้ ${user.firstName} ${user.lastName} หรือไม่?`,
      'ยืนยันการลบผู้ใช้'
    )
    
    if (!confirmed) {
      return
    }

    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      
      if (data.success) {
        showSuccess('ลบผู้ใช้สำเร็จ')
        fetchUsers()
      } else {
        showError(data.message)
      }
    } catch (error) {
      console.error('Delete user error:', error)
      showError('เกิดข้อผิดพลาดในการลบผู้ใช้')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const token = localStorage.getItem('accessToken')
      const url = modalMode === 'create'
        ? '/api/admin/users'
        : `/api/admin/users/${selectedUser?.id}`
      
      const body = modalMode === 'create'
        ? formData
        : { ...formData, password: formData.password || undefined }

      const response = await fetch(url, {
        method: modalMode === 'create' ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (data.success) {
        showSuccess(modalMode === 'create' ? 'สร้างผู้ใช้สำเร็จ' : 'อัปเดตผู้ใช้สำเร็จ')
        setIsModalOpen(false)
        fetchUsers()
      } else {
        showError(data.message)
      }
    } catch (error) {
      console.error('Submit error:', error)
      showError('เกิดข้อผิดพลาด')
    }
  }

  const columns = [
    { key: 'email', label: 'อีเมล' },
    {
      key: 'name',
      label: 'ชื่อ-นามสกุล',
      render: (_: unknown, row: UserRow) => `${row.firstName} ${row.lastName}`,
    },
    { key: 'role', label: 'บทบาท' },
    {
      key: 'organization',
      label: 'สังกัด',
      render: (_: unknown, row: UserRow) =>
        row.school?.name || row.network?.name || row.office?.name || '-',
    },
    {
      key: 'isActive',
      label: 'สถานะ',
      render: (value: unknown) => {
        const isActive = value as boolean
        return (
          <span className={`px-2 py-1 rounded-full text-xs ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
          </span>
        )
      },
    },
  ]

  const roleOptions = [
    { value: 'SUPER_ADMIN', label: 'Super Admin' },
    { value: 'OFFICE_ADMIN', label: 'Office Admin' },
    { value: 'NETWORK_ADMIN', label: 'Network Admin' },
    { value: 'SCHOOL_DIRECTOR', label: 'School Director' },
    { value: 'TEACHER', label: 'Teacher' },
    { value: 'VIEWER', label: 'Viewer' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้</h2>
          <p className="text-gray-600 mt-1">เพิ่ม แก้ไข และจัดการผู้ใช้ในระบบ</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          + เพิ่มผู้ใช้ใหม่
        </button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
        emptyMessage="ไม่มีข้อมูลผู้ใช้"
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'เพิ่มผู้ใช้ใหม่' : 'แก้ไขผู้ใช้'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="อีเมล"
            name="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          {modalMode === 'create' && (
            <FormField
              label="รหัสผ่าน"
              name="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          )}

          {modalMode === 'edit' && (
            <FormField
              label="รหัสผ่านใหม่ (เว้นว่างถ้าไม่ต้องการเปลี่ยน)"
              name="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="ชื่อ"
              name="firstName"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />

            <FormField
              label="นามสกุล"
              name="lastName"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>

          <FormField
            label="บทบาท"
            name="role"
            type="select"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            options={roleOptions}
            required
          />

          <div className="flex gap-4 mt-6">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              {modalMode === 'create' ? 'สร้างผู้ใช้' : 'บันทึก'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
