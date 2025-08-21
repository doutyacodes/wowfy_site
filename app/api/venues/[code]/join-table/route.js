import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { pages, tables, userSessions, users } from '../../../../../lib/schema';
import { eq, and, gt } from 'drizzle-orm';
import { verifyToken } from '../../../../../lib/auth';
import crypto from 'crypto';

export async function POST(request, { params }) {
  try {
    const { code } = params;
    const { tableCode } = await request.json();

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

    if (!code || !tableCode) {
      return NextResponse.json(
        { error: 'Venue code and table code are required' },
        { status: 400 }
      );
    }

    // Find the page/venue by code (assuming we have a code field or use ID)
    const page = await db
      .select()
      .from(pages)
      .where(eq(pages.id, code)) // Assuming code is the page ID for now
      .limit(1);

    if (page.length === 0) {
      return NextResponse.json(
        { error: 'Invalid venue code' },
        { status: 404 }
      );
    }

    const pageRecord = page[0];

    // Find table with matching code that hasn't expired
    const table = await db
      .select()
      .from(tables)
      .where(
        and(
          eq(tables.pageId, pageRecord.id),
          eq(tables.currentTableCode, tableCode.toUpperCase()),
          gt(tables.tableCodeExpiresAt, new Date()),
          eq(tables.isActive, 'yes')
        )
      )
      .limit(1);

    if (table.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired table code' },
        { status: 400 }
      );
    }

    const tableRecord = table[0];

    // Get user data to check if guest
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userRecord = user[0];

    // End any existing active sessions for this user
    await db
      .update(userSessions)
      .set({ 
        isActive: 'no', 
        endedAt: new Date() 
      })
      .where(
        and(
          eq(userSessions.userId, decoded.userId),
          eq(userSessions.isActive, 'yes')
        )
      );

    // Create new session
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const [newSession] = await db
      .insert(userSessions)
      .values({
        userId: decoded.userId,
        pageId: pageRecord.id,
        tableId: tableRecord.id,
        sessionToken: sessionToken,
        isActive: 'yes',
        pointsEarned: 0,
        tempPoints: 0,
        sessionType: userRecord.isGuest === 'yes' ? 'guest' : 'normal'
      });

    // Get session data with table and page info
    const sessionData = await db
      .select({
        id: userSessions.id,
        sessionToken: userSessions.sessionToken,
        table: {
          id: tables.id,
          tableNumber: tables.tableNumber,
          tableName: tables.tableName,
          capacity: tables.capacity
        },
        page: {
          id: pages.id,
          name: pages.name,
          pageType: pages.pageType,
          location: pages.location
        },
        sessionType: userSessions.sessionType,
        startedAt: userSessions.startedAt
      })
      .from(userSessions)
      .leftJoin(tables, eq(userSessions.tableId, tables.id))
      .leftJoin(pages, eq(userSessions.pageId, pages.id))
      .where(eq(userSessions.id, newSession.insertId))
      .limit(1);

    return NextResponse.json({
      message: 'Successfully joined table',
      session: sessionData[0],
      table: sessionData[0].table
    });

  } catch (error) {
    console.error('Join table error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}