import { NextResponse } from 'next/server'
import prisma from '../../lib/prisma'

/**
 * Health Check API - ตรวจสอบสถานะ Application และ Database
 * GET /api/health
 */
export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    database: {
      status: 'unknown',
      message: '',
      userCount: 0,
    },
    prisma: {
      status: 'unknown',
      message: '',
    },
  }

  // Test Prisma Client
  try {
    // Test basic connection with raw query
    await prisma.$queryRaw`SELECT 1`
    health.prisma.status = 'connected'
    health.prisma.message = 'Prisma Client is working'
  } catch (error) {
    health.status = 'error'
    health.prisma.status = 'error'
    health.prisma.message = error instanceof Error ? error.message : 'Unknown Prisma error'
  }

  // Test Database with actual query
  try {
    const userCount = await prisma.user.count()
    health.database.status = 'connected'
    health.database.userCount = userCount
    health.database.message = `Found ${userCount} users in database`
  } catch (error) {
    health.status = 'error'
    health.database.status = 'error'
    health.database.message = error instanceof Error ? error.message : 'Unknown database error'
  }

  const statusCode = health.status === 'ok' ? 200 : 500

  return NextResponse.json(health, { status: statusCode })
}
