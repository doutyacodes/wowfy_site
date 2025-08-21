import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { venues, otps } from '../../../../../lib/schema';
import { eq, and, gt } from 'drizzle-orm';

export async function POST(request, { params }) {
  try {
    const { code } = params;

    if (!code) {
      return NextResponse.json(
        { error: 'Venue code is required' },
        { status: 400 }
      );
    }

    const venue = await db
      .select()
      .from(venues)
      .where(eq(venues.code, code.toUpperCase()))
      .limit(1);

    if (venue.length === 0) {
      return NextResponse.json(
        { error: 'Invalid venue code' },
        { status: 404 }
      );
    }

    const venueRecord = venue[0];

    if (!venueRecord.isActive) {
      return NextResponse.json(
        { error: 'This venue is currently inactive' },
        { status: 403 }
      );
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db
      .insert(otps)
      .values({
        venueId: venueRecord.id,
        code: otpCode,
        expiresAt,
        isUsed: false,
      });

    return NextResponse.json({
      message: 'OTP generated successfully',
      otp: otpCode,
      expiresAt,
    });

  } catch (error) {
    console.error('OTP generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}