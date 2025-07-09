import { NextResponse } from 'next/server';
import { sql } from '@/lib/db-cache';

export async function GET() {
  try {
    // Test database connection
    const result = await sql`SELECT NOW() as current_time, version() as db_version`;
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful!',
      data: {
        currentTime: result[0].current_time,
        dbVersion: result[0].db_version,
        databaseUrl: process.env.DATABASE_URL ? 'Configured' : 'Not configured'
      }
    });
    
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Make sure DATABASE_URL is set in your .env file'
    }, { status: 500 });
  }
}