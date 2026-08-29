export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message);
    if (
      message.includes("client_pricing") ||
      (error as { code?: string }).code === "PGRST205"
    ) {
      return "client_pricing tablosu yok. Supabase SQL Editor'da supabase/migrations/0002_client_pricing.sql dosyasını çalıştırın.";
    }
    return message;
  }
  return "Bilinmeyen hata";
}
