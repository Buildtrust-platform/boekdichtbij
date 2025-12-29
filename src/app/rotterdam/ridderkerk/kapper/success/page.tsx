import { COPY } from "@/lib/copy";

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full mx-auto mb-6 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          {COPY.booking.receivedTitle}
        </h1>
        <p className="text-gray-500 mb-1">
          {COPY.booking.receivedLine1}
        </p>
        <p className="text-gray-500">
          {COPY.booking.receivedLine2}
        </p>
      </div>
    </main>
  );
}
