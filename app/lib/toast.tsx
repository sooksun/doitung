import { toast, ToastOptions, Id } from 'react-toastify'

const defaultOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
}

// Success toast
export const showSuccess = (message: string, options?: ToastOptions): Id => {
  return toast.success(message, { ...defaultOptions, ...options })
}

// Error toast
export const showError = (message: string, options?: ToastOptions): Id => {
  return toast.error(message, { ...defaultOptions, autoClose: 5000, ...options })
}

// Info toast
export const showInfo = (message: string, options?: ToastOptions): Id => {
  return toast.info(message, { ...defaultOptions, ...options })
}

// Warning toast
export const showWarning = (message: string, options?: ToastOptions): Id => {
  return toast.warn(message, { ...defaultOptions, ...options })
}

// Loading toast
export const showLoading = (message: string = 'กำลังโหลด...'): Id => {
  return toast.loading(message, { position: 'top-right' })
}

// Update toast (for loading -> success/error)
export const updateToast = (
  toastId: Id,
  type: 'success' | 'error' | 'info' | 'warning',
  message: string
) => {
  toast.update(toastId, {
    render: message,
    type,
    isLoading: false,
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
  })
}

// Dismiss toast
export const dismissToast = (toastId?: Id) => {
  if (toastId) {
    toast.dismiss(toastId)
  } else {
    toast.dismiss()
  }
}

// Confirm dialog using promise
export const confirmAction = (
  message: string,
  title: string = 'ยืนยันการดำเนินการ'
): Promise<boolean> => {
  return new Promise((resolve) => {
    const toastId = toast.info(
      <div className="flex flex-col gap-3">
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="text-gray-600">{message}</p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => {
              toast.dismiss(toastId)
              resolve(true)
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ยืนยัน
          </button>
          <button
            onClick={() => {
              toast.dismiss(toastId)
              resolve(false)
            }}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      </div>,
      {
        position: 'top-center',
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        closeButton: false,
        className: 'bg-white shadow-xl rounded-xl p-2',
      }
    )
  })
}

// Utility for CRUD operations
export const crudToast = {
  save: {
    loading: () => showLoading('กำลังบันทึก...'),
    success: () => showSuccess('บันทึกสำเร็จ'),
    error: (error?: string) => showError(error || 'เกิดข้อผิดพลาดในการบันทึก'),
  },
  update: {
    loading: () => showLoading('กำลังอัปเดต...'),
    success: () => showSuccess('อัปเดตสำเร็จ'),
    error: (error?: string) => showError(error || 'เกิดข้อผิดพลาดในการอัปเดต'),
  },
  delete: {
    loading: () => showLoading('กำลังลบ...'),
    success: () => showSuccess('ลบสำเร็จ'),
    error: (error?: string) => showError(error || 'เกิดข้อผิดพลาดในการลบ'),
  },
  submit: {
    loading: () => showLoading('กำลังส่งข้อมูล...'),
    success: () => showSuccess('ส่งข้อมูลสำเร็จ'),
    error: (error?: string) => showError(error || 'เกิดข้อผิดพลาดในการส่งข้อมูล'),
  },
}
