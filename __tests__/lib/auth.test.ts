import { hashPassword, verifyPassword, generateAccessToken, verifyAccessToken } from '@/app/lib/auth'

describe('Auth Utilities', () => {
  describe('Password Hashing', () => {
    it('should hash password correctly', async () => {
      const password = 'test123'
      const hashed = await hashPassword(password)
      
      expect(hashed).toBeDefined()
      expect(hashed).not.toBe(password)
    })

    it('should verify correct password', async () => {
      const password = 'test123'
      const hashed = await hashPassword(password)
      const isValid = await verifyPassword(password, hashed)
      
      expect(isValid).toBe(true)
    })

    it('should reject incorrect password', async () => {
      const password = 'test123'
      const hashed = await hashPassword(password)
      const isValid = await verifyPassword('wrong', hashed)
      
      expect(isValid).toBe(false)
    })
  })

  describe('JWT Token', () => {
    it('should generate and verify access token', () => {
      const payload = {
        userId: '1',
        email: 'test@example.com',
        role: 'TEACHER' as any,
      }

      const token = generateAccessToken(payload)
      const decoded = verifyAccessToken(token)

      expect(decoded).toBeDefined()
      expect(decoded?.userId).toBe(payload.userId)
      expect(decoded?.email).toBe(payload.email)
      expect(decoded?.role).toBe(payload.role)
    })

    it('should return null for invalid token', () => {
      const decoded = verifyAccessToken('invalid-token')
      expect(decoded).toBeNull()
    })
  })
})
