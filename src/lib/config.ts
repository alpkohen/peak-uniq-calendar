export function getSupabaseConfigError(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return "Supabase ortam değişkenleri eksik. .env.local dosyasını oluşturun.";
  }

  if (
    url.includes("your-project-ref") ||
    serviceKey === "your-service-role-key"
  ) {
    return "Supabase anahtarları placeholder. .env.local.example dosyasını .env.local olarak kopyalayıp gerçek değerleri girin.";
  }

  return null;
}

export function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Bilinmeyen hata";
}
