import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { userSessions, pages, tables, users } from '../../../../lib/schema';
import { eq, and } from 'drizzle-orm';
import { verifyToken } from '../../../../lib/auth';

export async function GET(request, { params }) {
  try {
    const { sessionId } = params;
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

    // Get session data with related table and page info
    const sessionData = await db
      .select({
        id: userSessions.id,
        sessionToken: userSessions.sessionToken,
        startedAt: userSessions.startedAt,
        endedAt: userSessions.endedAt,
        isActive: userSessions.isActive,
        pointsEarned: userSessions.pointsEarned,
        tempPoints: userSessions.tempPoints,
        sessionType: userSessions.sessionType,
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
          location: pages.location,
          description: pages.description,
          logo: pages.logo
        }
      })
      .from(userSessions)
      .leftJoin(tables, eq(userSessions.tableId, tables.id))
      .leftJoin(pages, eq(userSessions.pageId, pages.id))
      .where(
        and(
          eq(userSessions.id, parseInt(sessionId)),
          eq(userSessions.userId, decoded.userId),
          eq(userSessions.isActive, 'yes')
        )
      )
      .limit(1);

    if (sessionData.length === 0) {
      return NextResponse.json(
        { error: 'Session not found or not active' },
        { status: 404 }
      );
    }

    return NextResponse.json(sessionData[0]);

  } catch (error) {
    console.error('Session fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}