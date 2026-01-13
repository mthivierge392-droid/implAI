// app/api/phone-numbers/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { twilioClient } from '@/lib/twilio';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { areaCode, country } = body;

    console.log('📞 Search request:', { areaCode, country });

    if (!country) {
      return NextResponse.json(
        { error: 'Country is required' },
        { status: 400 }
      );
    }

    // Countries that require area code
    const areaCodeRequired = ['US', 'CA'];
    if (areaCodeRequired.includes(country) && !areaCode) {
      return NextResponse.json(
        { error: `Area code is required for ${country} numbers` },
        { status: 400 }
      );
    }

    // Search for available phone numbers
    const searchParams: any = { limit: 20 };
    if (areaCode) {
      searchParams.areaCode = areaCode;
    }

    console.log('🔍 Searching Twilio with params:', { country, ...searchParams });

    let availableNumbers;
    try {
      availableNumbers = await twilioClient.availablePhoneNumbers(country)
        .local
        .list(searchParams);
    } catch (twilioError: any) {
      // Handle Twilio-specific errors
      if (twilioError.status === 404 || twilioError.code === 20404) {
        console.error(`❌ Country ${country} not supported for local numbers`);
        return NextResponse.json(
          {
            error: 'Country not supported',
            message: `${country} phone numbers are not currently available through our provider. Please try a different country.`,
            unsupportedCountry: true
          },
          { status: 400 }
        );
      }
      throw twilioError;
    }

    console.log(`✅ Found ${availableNumbers.length} numbers`);

    const numbers = availableNumbers.map((number) => ({
      phoneNumber: number.phoneNumber,
      friendlyName: number.friendlyName,
      locality: number.locality,
      region: number.region,
      postalCode: number.postalCode,
    }));

    return NextResponse.json({ numbers });
  } catch (error: any) {
    console.error('❌ Search error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to search phone numbers' },
      { status: 500 }
    );
  }
}
