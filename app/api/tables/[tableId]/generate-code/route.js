import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { tables, pages } from '../../../../../lib/schema';
import { eq, and } from 'drizzle-orm';
import { generateTableCode, generateModeratorCode } from '../../../../../lib/tableCode';

export async function POST(request, { params }) {
  try {
    const { tableId } = params;

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
        pageName: pages.name,
        pageType: pages.pageType,
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

    // Generate table access code
    const codeData = generateTableCode(parseInt(tableId));
    
    // Generate moderator code for demo purposes
    const moderatorCode = generateModeratorCode(parseInt(tableId));

    return NextResponse.json({
      message: 'Table access code generated successfully',
      tableCode: codeData.code,
      expiresAt: codeData.expiresAt,
      moderatorCode, // For demo - in real app, this would be given to staff
      table: {
        id: tableRecord.tableId,
        number: tableRecord.tableNumber,
        name: tableRecord.tableName,
        page: {
          id: tableRecord.pageId,
          name: tableRecord.pageName,
          type: tableRecord.pageType,
        }
      }
    });

  } catch (error) {
    console.error('Table code generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}