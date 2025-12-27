"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

function CheckoutForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);
    setError("");

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/boeken/succes?bookingId=${bookingId}`,
      },
    });

    if (submitError) {
      setError(submitError.message || "Betaling mislukt");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>
      )}

      <PaymentElement />

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-black text-white py-3 rounded hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Verwerken..." : "Betalen"}
      </button>
    </form>
  );
}

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookingId) {
      router.push("/boeken");
      return;
    }

    async function createPaymentIntent() {
      try {
        const res = await fetch("/api/payments/create-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Betaling starten mislukt");
          return;
        }

        setClientSecret(data.clientSecret);
      } catch {
        setError("Er is iets misgegaan");
      }
    }

    createPaymentIntent();
  }, [bookingId, router]);

  if (!bookingId) return null;

  if (error) {
    return (
      <main className="min-h-screen px-4 py-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-6">Betaling</h1>
          <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>
          <button
            onClick={() => router.push("/boeken")}
            className="mt-4 w-full border border-gray-300 py-3 rounded hover:bg-gray-50"
          >
            Terug naar boeken
          </button>
        </div>
      </main>
    );
  }

  if (!clientSecret) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Betaling voorbereiden...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-2">Betaling</h1>
        <p className="text-gray-600 mb-6">Stap 4 van 4</p>

        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: { theme: "stripe" },
          }}
        >
          <CheckoutForm bookingId={bookingId} />
        </Elements>
      </div>
    </main>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center"><p>Laden...</p></main>}>
      <PaymentPageContent />
    </Suspense>
  );
}
