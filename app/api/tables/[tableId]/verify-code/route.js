import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { tables, pages, userSessions } from '../../../../../lib/schema';
import { eq, and } from 'drizzle-orm';
import { verifyTableCode } from '../../../../../lib/tableCode';
import { verifyToken } from '../../../../../lib/auth';
import crypto from 'crypto';

export async function POST(request, { params }) {
  try {
    const { tableId } = params;
    const { code } = await request.json();

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

    if (!tableId || !code) {
      return NextResponse.json(
        { error: 'Table ID and code are required' },
        { status: 400 }
      );
    }

    // Verify the table code
    const codeVerification = verifyTableCode(code, parseInt(tableId));
    
    if (!codeVerification.valid) {
      return NextResponse.json(
        { error: codeVerification.error },
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
        pageLocation: pages.location,
      })
      .from(tables)
      .leftJoin(pages, eq(tables.pageId, pages.id))
      .where(and(
        eq(tables.id, parseInt(tableId)),
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
      message: 'Successfully joined table',
      session: {
        id: newSession.insertId,
        sessionToken,
        page: {
          id: tableRecord.pageId,
          name: tableRecord.pageName,
          type: tableRecord.pageType,
          location: tableRecord.pageLocation,
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
    console.error('Table code verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}