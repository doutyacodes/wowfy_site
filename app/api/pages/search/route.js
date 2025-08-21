import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { pages, tables } from '../../../../lib/schema';
import { eq, and, like } from 'drizzle-orm';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Search pages by name
    const searchResults = await db
      .select({
        pageId: pages.id,
        pageName: pages.name,
        pageType: pages.pageType,
        location: pages.location,
        logo: pages.logo,
        tableCount: db.$count(tables, eq(tables.pageId, pages.id))
      })
      .from(pages)
      .leftJoin(tables, eq(pages.id, tables.pageId))
      .where(and(
        like(pages.name, `%${query}%`),
        eq(pages.isActive, 'yes')
      ))
      .groupBy(pages.id)
      .limit(10);

    return NextResponse.json({
      query,
      results: searchResults
    });

  } catch (error) {
    console.error('Page search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}