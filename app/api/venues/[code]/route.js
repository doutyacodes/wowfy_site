import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { pages, tables } from '../../../../lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(request, { params }) {
  try {
    const { code } = params;

    if (!code) {
      return NextResponse.json(
        { error: 'Page code is required' },
        { status: 400 }
      );
    }

    // For now, assuming code is the page ID. In production, you might want a separate code field
    const page = await db
      .select()
      .from(pages)
      .where(eq(pages.id, parseInt(code)))
      .limit(1);

    if (page.length === 0) {
      return NextResponse.json(
        { error: 'Invalid page code' },
        { status: 404 }
      );
    }

    const pageRecord = page[0];

    if (pageRecord.isActive !== 'yes') {
      return NextResponse.json(
        { error: 'This venue is currently inactive' },
        { status: 403 }
      );
    }

    const pageTables = await db
      .select()
      .from(tables)
      .where(eq(tables.pageId, pageRecord.id));

    return NextResponse.json({
      page: {
        id: pageRecord.id,
        name: pageRecord.name,
        pageType: pageRecord.pageType,
        location: pageRecord.location,
        description: pageRecord.description,
        logo: pageRecord.logo,
        banner: pageRecord.banner,
        contactEmail: pageRecord.contactEmail,
        contactPhone: pageRecord.contactPhone
      },
      tables: pageTables.filter(table => table.isActive === 'yes')
    });

  } catch (error) {
    console.error('Page fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}