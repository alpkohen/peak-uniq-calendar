import type { GoogleCalendarEvent } from "./types";

// Mock Google Calendar events — gerçek service account bağlantısı sonra eklenecek
export function getMockCalendarEvents(
  calendarId: string,
  trainerName: string,
): GoogleCalendarEvent[] {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");

  const isDelivery = calendarId.includes("delivery");
  const isBlock = calendarId.includes("block");

  if (!isDelivery && !isBlock) return [];

  const prefix = isDelivery ? "delivery" : "block";

  return [
    {
      id: `${prefix}-allday-${trainerName}`,
      summary: isDelivery
        ? "Vakıf Katılım | Satış ve Yapay Zeka"
        : "İzin",
      start: { date: `${y}-${m}-05` },
      end: { date: `${y}-${m}-06` },
    },
    {
      id: `${prefix}-am-${trainerName}`,
      summary: isDelivery
        ? "ABC Bank | CX Eğitimi"
        : "Rapor yazımı",
      start: {
        dateTime: `${y}-${m}-10T09:00:00+03:00`,
      },
      end: {
        dateTime: `${y}-${m}-10T12:30:00+03:00`,
      },
    },
    {
      id: `${prefix}-pm-${trainerName}`,
      summary: isDelivery
        ? "XYZ Holding | Liderlik"
        : "İç toplantı",
      start: {
        dateTime: `${y}-${m}-12T14:00:00+03:00`,
      },
      end: {
        dateTime: `${y}-${m}-12T17:00:00+03:00`,
      },
    },
    {
      id: `${prefix}-fullday-${trainerName}`,
      summary: isDelivery
        ? "Bilinmeyen Müşteri | Özel Program"
        : "Kişisel meşguliyet",
      start: {
        dateTime: `${y}-${m}-15T09:00:00+03:00`,
      },
      end: {
        dateTime: `${y}-${m}-15T18:00:00+03:00`,
      },
    },
    {
      id: `${prefix}-multiday-${trainerName}`,
      summary: isDelivery
        ? "Mega Corp | Tahsilat Atölyesi"
        : "Seyahat",
      start: { date: `${y}-${m}-20` },
      end: { date: `${y}-${m}-23` },
    },
  ];
}

export async function fetchCalendarEvents(
  calendarId: string,
  trainerName: string,
): Promise<GoogleCalendarEvent[]> {
  // TODO: Google service account ile events.list + syncToken
  return getMockCalendarEvents(calendarId, trainerName);
}
