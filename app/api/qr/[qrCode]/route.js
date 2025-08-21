import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { pages, tables } from '../../../../lib/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request, { params }) {
  try {
    const { qrCode } = params;

    if (!qrCode) {
      return NextResponse.json(
        { error: 'QR code is required' },
        { status: 400 }
      );
    }

    // Find table by QR code
    const table = await db
      .select({
        tableId: tables.id,
        tableNumber: tables.tableNumber,
        tableName: tables.tableName,
        capacity: tables.capacity,
        pageId: tables.pageId,
        pageType: pages.pageType,
        pageName: pages.name,
        pageDescription: pages.description,
        pageLocation: pages.location,
        pageLogo: pages.logo,
        pageBanner: pages.banner,
      })
      .from(tables)
      .leftJoin(pages, eq(tables.pageId, pages.id))
      .where(and(
        eq(tables.qrCode, qrCode),
        eq(tables.isActive, 'yes'),
        eq(pages.isActive, 'yes')
      ))
      .limit(1);

    if (table.length === 0) {
      return NextResponse.json(
        { error: 'Invalid QR code or inactive table/page' },
        { status: 404 }
      );
    }

    const tableRecord = table[0];

    return NextResponse.json({
      page: {
        id: tableRecord.pageId,
        name: tableRecord.pageName,
        description: tableRecord.pageDescription,
        pageType: tableRecord.pageType,
        location: tableRecord.pageLocation,
        logo: tableRecord.pageLogo,
        banner: tableRecord.pageBanner,
      },
      table: {
        id: tableRecord.tableId,
        tableNumber: tableRecord.tableNumber,
        tableName: tableRecord.tableName,
        capacity: tableRecord.capacity,
      }
    });

  } catch (error) {
    console.error('QR code lookup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}