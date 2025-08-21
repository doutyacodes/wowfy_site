import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { pages, tables } from '../../../../lib/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request, { params }) {
  try {
    const { pageId } = params;

    if (!pageId) {
      return NextResponse.json(
        { error: 'Page ID is required' },
        { status: 400 }
      );
    }

    const page = await db
      .select()
      .from(pages)
      .where(and(
        eq(pages.id, parseInt(pageId)),
        eq(pages.isActive, 'yes')
      ))
      .limit(1);

    if (page.length === 0) {
      return NextResponse.json(
        { error: 'Page not found or inactive' },
        { status: 404 }
      );
    }

    const pageRecord = page[0];

    const pageTables = await db
      .select()
      .from(tables)
      .where(and(
        eq(tables.pageId, pageRecord.id),
        eq(tables.isActive, 'yes')
      ));

    return NextResponse.json({
      page: {
        id: pageRecord.id,
        name: pageRecord.name,
        description: pageRecord.description,
        pageType: pageRecord.pageType,
        location: pageRecord.location,
        logo: pageRecord.logo,
        banner: pageRecord.banner,
      },
      tables: pageTables.map(table => ({
        id: table.id,
        tableNumber: table.tableNumber,
        tableName: table.tableName,
        capacity: table.capacity,
        qrCode: table.qrCode,
      }))
    });

  } catch (error) {
    console.error('Page fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}