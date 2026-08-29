type Props = {
  title: string;
  message: string;
};

export function ErrorBanner({ title, message }: Props) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm">{message}</p>
      <pre className="mt-3 overflow-x-auto rounded bg-red-100 p-3 text-xs">
        cp .env.local.example .env.local
      </pre>
    </div>
  );
}
