"use server";

import type { PaidVenueHintResponse } from "@queuekeeper/shared";

type GeocodeResult = {
  display_name?: string;
  lat?: string;
  lon?: string;
};

type WeatherSnapshot = {
  timezone?: string;
  current?: {
    temperature_2m?: number;
    precipitation?: number;
    wind_speed_10m?: number;
    is_day?: number;
  };
  hourly?: {
    precipitation_probability?: number[];
  };
};

async function geocodeArea(coarseArea: string) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(coarseArea)}`,
    {
      headers: {
        "user-agent": "QueueKeeper/1.0"
      },
      cache: "no-store"
    }
  );
  if (!response.ok) {
    return null;
  }
  const results = (await response.json()) as GeocodeResult[];
  const first = results[0];
  if (!first?.lat || !first.lon) {
    return null;
  }
  return {
    name: first.display_name ?? coarseArea,
    latitude: Number(first.lat),
    longitude: Number(first.lon)
  };
}

async function fetchWeather(latitude: number, longitude: number) {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,precipitation,wind_speed_10m,is_day&hourly=precipitation_probability&forecast_hours=1&timezone=auto`,
    { cache: "no-store" }
  );
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as WeatherSnapshot;
}

function buildRecommendation(weather: WeatherSnapshot | null, timingWindow: string) {
  const current = weather?.current;
  const precipitationProbability = weather?.hourly?.precipitation_probability?.[0] ?? 0;

  if (!current) {
    return {
      confidence: "watch" as const,
      recommendation: "scout",
      summary: `Paid venue hint: limited external signal for ${timingWindow}, so scout first before committing to a hold.`
    };
  }

  const rainy = Number(current.precipitation ?? 0) > 0 || precipitationProbability >= 45;
  const windy = Number(current.wind_speed_10m ?? 0) >= 20;
  const veryCold = Number(current.temperature_2m ?? 0) <= 4;
  const lateWindow = timingWindow.toLowerCase().includes("tonight") || Number(current.is_day ?? 1) === 0;

  if (rainy || windy) {
    return {
      confidence: "scout" as const,
      recommendation: "scout",
      summary: "Paid venue hint: weather friction is elevated, so scout first and avoid escalating into a long hold until the runner confirms the line quality."
    };
  }

  if (lateWindow || veryCold) {
    return {
      confidence: "watch" as const,
      recommendation: "watch",
      summary: "Paid venue hint: conditions favor short scouting loops over immediate hold; keep the next increment small and reassess after proof arrives."
    };
  }

  return {
    confidence: "hold" as const,
    recommendation: "hold",
    summary: "Paid venue hint: conditions look stable enough to justify escalating from scout into hold if the first proof is positive."
  };
}

export async function buildPaidVenueHint({
  coarseArea,
  taskId,
  timingWindow
}: {
  coarseArea: string;
  taskId?: string | null;
  timingWindow: string;
}): Promise<PaidVenueHintResponse> {
  const geocode = await geocodeArea(coarseArea);
  const weather = geocode ? await fetchWeather(geocode.latitude, geocode.longitude) : null;
  const recommendation = buildRecommendation(weather, timingWindow);

  return {
    provider: "queuekeeper-x402",
    taskId: taskId ?? null,
    signalId: crypto.randomUUID(),
    coarseArea: geocode?.name ?? coarseArea,
    timingWindow,
    recommendation: recommendation.recommendation,
    confidence: recommendation.confidence,
    summary: recommendation.summary,
    purchasedAt: new Date().toISOString()
  };
}
