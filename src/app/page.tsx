import Link from "next/link";
import { Button } from "@/components/ui";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 via-white to-white">
      {/* Header */}
      <header className="px-4 py-4 sm:px-6">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <ScissorsIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">BoekDichtbij</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Inloggen
            </Link>
            <Link href="/register">
              <Button variant="outline" size="sm">
                Registreren
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="px-4 sm:px-6 pt-12 pb-16 sm:pt-20 sm:pb-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-3 py-1.5 rounded-full text-sm font-medium mb-6">
            <SparkleIcon className="w-4 h-4" />
            Nu beschikbaar in Ridderkerk
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight">
            Boek een kapper
            <span className="block text-primary-600">bij jou thuis</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Professionele kappers komen naar jou toe. Kies een tijdvak, bevestig je afspraak, en wij regelen de rest.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/boeken" className="w-full sm:w-auto">
              <Button size="lg" fullWidth className="sm:w-auto sm:px-8">
                <CalendarIcon className="w-5 h-5" />
                Afspraak maken
              </Button>
            </Link>
            <Link href="/mijn-afspraken" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" fullWidth className="sm:w-auto sm:px-8">
                Mijn afspraken
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 sm:px-6 py-16 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-12">
            Hoe het werkt
          </h2>

          <div className="grid sm:grid-cols-3 gap-8">
            <FeatureCard
              step={1}
              icon={<CalendarCheckIcon className="w-6 h-6" />}
              title="Kies een moment"
              description="Selecteer een datum en tijdvak dat jou uitkomt. Ochtend, middag of avond."
            />
            <FeatureCard
              step={2}
              icon={<CreditCardIcon className="w-6 h-6" />}
              title="Bevestig & betaal"
              description="Veilig betalen met iDEAL of creditcard. Pas na betaling wordt een kapper gezocht."
            />
            <FeatureCard
              step={3}
              icon={<HomeIcon className="w-6 h-6" />}
              title="Kapper komt langs"
              description="Een gekwalificeerde kapper komt naar jouw adres op het afgesproken moment."
            />
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="px-4 sm:px-6 py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-4">
            Onze diensten
          </h2>
          <p className="text-gray-600 text-center mb-10 max-w-xl mx-auto">
            Professionele knipbeurten en baardverzorging bij jou thuis
          </p>

          <div className="grid sm:grid-cols-3 gap-4">
            <ServiceCard
              name="Knipbeurt"
              duration="30 min"
              price="€25,00"
            />
            <ServiceCard
              name="Baard trimmen"
              duration="15 min"
              price="€15,00"
            />
            <ServiceCard
              name="Knipbeurt + Baard"
              duration="45 min"
              price="€35,00"
              popular
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 sm:px-6 py-16 bg-primary-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Klaar om te boeken?
          </h2>
          <p className="text-primary-100 mb-8 max-w-lg mx-auto">
            Plan nu je afspraak en ervaar het gemak van een kapper aan huis.
          </p>
          <Link href="/boeken">
            <Button
              variant="secondary"
              size="lg"
              className="bg-white text-primary-700 hover:bg-primary-50"
            >
              Boek nu je afspraak
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-6 py-8 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary-500 rounded flex items-center justify-center">
                <ScissorsIcon className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white">BoekDichtbij</span>
            </div>
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} BoekDichtbij. Alle rechten voorbehouden.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  step,
  icon,
  title,
  description,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="relative text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-100 text-primary-600 rounded-2xl mb-4">
        {icon}
      </div>
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-primary-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
        {step}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}

function ServiceCard({
  name,
  duration,
  price,
  popular = false,
}: {
  name: string;
  duration: string;
  price: string;
  popular?: boolean;
}) {
  return (
    <div
      className={`
        relative bg-white rounded-xl p-5 border-2 transition-all
        ${popular ? "border-primary-500 shadow-lg" : "border-gray-200"}
      `}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-xs font-medium px-3 py-1 rounded-full">
          Populair
        </div>
      )}
      <h3 className="font-semibold text-gray-900">{name}</h3>
      <p className="text-sm text-gray-500 mt-1">{duration}</p>
      <p className="text-xl font-bold text-primary-600 mt-3">{price}</p>
    </div>
  );
}

function ScissorsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 1l2.39 5.58L18 7.24l-4.55 3.9L14.76 17 10 14.27 5.24 17l1.31-5.86L2 7.24l5.61-.66L10 1z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function CalendarCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l2 2 4-4" />
    </svg>
  );
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}
