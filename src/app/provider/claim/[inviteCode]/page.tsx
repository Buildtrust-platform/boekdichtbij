"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { COPY } from "@/lib/copy";

type PayoutType = "percentage" | "fixed";

interface InviteData {
  providerId: string;
  phone?: string;
}

export default function ClaimPage() {
  const params = useParams();
  const inviteCode = params.inviteCode as string;

  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [payoutType, setPayoutType] = useState<PayoutType>("percentage");
  const [payoutValue, setPayoutValue] = useState<number>(80);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load invite data to pre-fill phone if available
  useEffect(() => {
    async function loadInvite() {
      try {
        const response = await fetch(`/api/provider/invite/${inviteCode}`);
        if (response.ok) {
          const data: InviteData = await response.json();
          if (data.phone) {
            setWhatsappPhone(data.phone);
          }
        }
      } catch {
        // Ignore - phone pre-fill is optional
      } finally {
        setIsLoading(false);
      }
    }
    loadInvite();
  }, [inviteCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Client-side validation
    const trimmedPhone = whatsappPhone.trim();
    if (!trimmedPhone) {
      setError(COPY.providerClaim.whatsappRequired);
      setIsSubmitting(false);
      return;
    }

    if (!trimmedPhone.startsWith("+") || trimmedPhone.length < 10 || trimmedPhone.length > 17) {
      setError(COPY.providerClaim.whatsappInvalid);
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/provider/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode,
          whatsappPhone: trimmedPhone,
          payoutType,
          payoutValue,
          isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "invite_not_found") {
          setError(COPY.providerClaim.invalidInvite);
        } else if (data.error === "invite_already_used") {
          setError(COPY.providerClaim.alreadyUsed);
        } else if (data.error === "phone_in_use") {
          setError(COPY.providerClaim.whatsappInUse);
        } else if (data.error === "invalid_phone") {
          setError(COPY.providerClaim.whatsappInvalid);
        } else {
          setError(COPY.messages.error);
        }
        return;
      }

      setSuccess(true);
    } catch {
      setError(COPY.messages.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {COPY.providerClaim.successTitle}
          </h1>
          <p className="text-gray-600">{COPY.providerClaim.successMessage}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-gray-500">{COPY.messages.loading}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {COPY.providerClaim.pageTitle}
          </h1>
          <p className="text-gray-600 mb-6">
            {COPY.providerClaim.pageSubtitle}
          </p>

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* WhatsApp Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {COPY.providerClaim.whatsappLabel} *
              </label>
              <input
                type="tel"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="+31612345678"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">
                {COPY.providerClaim.whatsappHint}
              </p>
            </div>

            {/* Payout Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {COPY.providerClaim.payoutLabel}
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="payoutType"
                    value="percentage"
                    checked={payoutType === "percentage"}
                    onChange={() => {
                      setPayoutType("percentage");
                      setPayoutValue(80);
                    }}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-gray-700">
                    {COPY.providerClaim.payoutPercentage}
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="payoutType"
                    value="fixed"
                    checked={payoutType === "fixed"}
                    onChange={() => {
                      setPayoutType("fixed");
                      setPayoutValue(25);
                    }}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-gray-700">
                    {COPY.providerClaim.payoutFixed}
                  </span>
                </label>
              </div>
            </div>

            {/* Payout Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {payoutType === "percentage"
                  ? COPY.providerClaim.percentageLabel
                  : COPY.providerClaim.fixedAmountLabel}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={payoutValue}
                  onChange={(e) => setPayoutValue(Number(e.target.value))}
                  min={payoutType === "percentage" ? 1 : 1}
                  max={payoutType === "percentage" ? 100 : 10000}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                  {payoutType === "percentage" ? "%" : "€"}
                </span>
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-start">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-5 w-5 text-blue-600 mt-0.5"
              />
              <div className="ml-3">
                <label
                  htmlFor="isActive"
                  className="text-sm font-medium text-gray-700"
                >
                  {COPY.providerClaim.activateLabel}
                </label>
                <p className="text-sm text-gray-500">
                  {COPY.providerClaim.activateDescription}
                </p>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? COPY.messages.loading : COPY.providerClaim.submitButton}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
