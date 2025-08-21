import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { userSessions, tables, pages } from '../../../../lib/schema';
import { eq, and } from 'drizzle-orm';
import { verifyToken } from '../../../../lib/auth';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const { tableId } = await request.json();

    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    if (!tableId) {
      return NextResponse.json(
        { error: 'Table ID is required' },
        { status: 400 }
      );
    }

    // Verify table exists and is active
    const table = await db
      .select({
        tableId: tables.id,
        pageId: tables.pageId,
        tableNumber: tables.tableNumber,
        tableName: tables.tableName,
        capacity: tables.capacity,
        pageName: pages.name,
        pageType: pages.pageType,
      })
      .from(tables)
      .leftJoin(pages, eq(tables.pageId, pages.id))
      .where(and(
        eq(tables.id, tableId),
        eq(tables.isActive, 'yes'),
        eq(pages.isActive, 'yes')
      ))
      .limit(1);

    if (table.length === 0) {
      return NextResponse.json(
        { error: 'Table not found or inactive' },
        { status: 404 }
      );
    }

    const tableRecord = table[0];

    // End any existing active sessions for this user
    await db
      .update(userSessions)
      .set({ 
        isActive: 'no', 
        endedAt: new Date() 
      })
      .where(and(
        eq(userSessions.userId, decoded.userId),
        eq(userSessions.isActive, 'yes')
      ));

    // Generate unique session token
    const sessionToken = crypto.randomUUID();

    // Create new session
    const [newSession] = await db
      .insert(userSessions)
      .values({
        userId: decoded.userId,
        pageId: tableRecord.pageId,
        tableId: tableRecord.tableId,
        sessionToken,
        isActive: 'yes',
        pointsEarned: 0,
      });

    return NextResponse.json({
      message: 'Session created successfully',
      session: {
        id: newSession.insertId,
        sessionToken,
        page: {
          id: tableRecord.pageId,
          name: tableRecord.pageName,
          type: tableRecord.pageType,
        },
        table: {
          id: tableRecord.tableId,
          number: tableRecord.tableNumber,
          name: tableRecord.tableName,
          capacity: tableRecord.capacity,
        }
      },
    });

  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}