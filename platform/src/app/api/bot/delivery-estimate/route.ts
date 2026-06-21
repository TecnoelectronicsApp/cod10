import { NextResponse } from 'next/server';
import {
  buildDeliveryRulesText,
  estimateDelivery,
  formatDeliveryEstimate,
} from '@/lib/bot/delivery';

export const dynamic = 'force-dynamic';

/** POST /api/bot/delivery-estimate { lat, lng, address, text } */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      lat?: number;
      lng?: number;
      address?: string;
      text?: string;
    };

    const estimate = await estimateDelivery({
      lat: body.lat,
      lng: body.lng,
      address: body.address,
      text: body.text,
    });

    if (!estimate) {
      return NextResponse.json(
        {
          ok: false,
          error: 'No se pudo estimar. Envía coords, link de Google Maps o dirección.',
          rules: buildDeliveryRulesText(),
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      ok: true,
      fee: estimate.fee,
      distanceKm: estimate.distanceKm,
      source: estimate.source,
      formatted: formatDeliveryEstimate(estimate),
      rules: buildDeliveryRulesText(),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: detail }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    rules: buildDeliveryRulesText(),
    hint: 'POST con { lat, lng } o { address } o { text } con link/coords',
  });
}
