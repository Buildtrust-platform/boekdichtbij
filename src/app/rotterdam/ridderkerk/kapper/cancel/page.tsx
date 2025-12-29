import Link from "next/link";
import { COPY } from "@/lib/copy";

export default function CancelPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          {COPY.booking.cancelledTitle}
        </h1>
        <p className="text-gray-500 mb-1">
          {COPY.booking.cancelledLine1}
        </p>
        <p className="text-gray-500 mb-6">
          {COPY.booking.cancelledLine2}
        </p>
        <Link
          href="/rotterdam/ridderkerk/kapper"
          className="inline-block bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          {COPY.booking.tryAgain}
        </Link>
      </div>
    </main>
  );
}
