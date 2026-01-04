import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui";

export const metadata: Metadata = {
  title: "Lokaal boeken, eenvoudig geregeld | BoekDichtbij",
  description:
    "Boek een kapper of schoonmaakdienst bij jou in de buurt. Kies een moment, betaal veilig en wij regelen de rest. Actief in 15 gebieden rondom Rotterdam.",
  keywords: "kapper boeken, schoonmaak boeken, Ridderkerk, Barendrecht, Schiedam, Vlaardingen, Capelle aan den IJssel, Rotterdam-West, Rotterdam-Zuid, Maassluis, Spijkenisse, Hoogvliet, IJsselmonde, Krimpen aan den IJssel, Berkel en Rodenrijs, Bergschenhoek, Bleiswijk, lokale diensten",
};

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 via-white to-white">
      {/* Header */}
      <header className="px-4 py-4 sm:px-6">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <HomeServiceIcon className="w-5 h-5 text-white" />
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
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="px-4 sm:px-6 pt-12 pb-16 sm:pt-20 sm:pb-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight">
            Lokaal boeken,
            <span className="block text-primary-600">eenvoudig geregeld</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Boek een kapper of schoonmaakdienst bij jou in de buurt. Kies een moment, betaal veilig en wij regelen de rest.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/rotterdam/ridderkerk">
              <Button size="lg" className="px-6">
                <LocationIcon className="w-5 h-5" />
                Ridderkerk
              </Button>
            </Link>
            <Link href="/rotterdam/barendrecht">
              <Button variant="outline" size="lg" className="px-6">
                <LocationIcon className="w-5 h-5" />
                Barendrecht
              </Button>
            </Link>
            <Link href="/rotterdam/zuid">
              <Button variant="outline" size="lg" className="px-6">
                <LocationIcon className="w-5 h-5" />
                Rotterdam-Zuid
              </Button>
            </Link>
            <Link href="/rotterdam/west">
              <Button variant="outline" size="lg" className="px-6">
                <LocationIcon className="w-5 h-5" />
                Rotterdam-West
              </Button>
            </Link>
            <Link href="/rotterdam/schiedam">
              <Button variant="outline" size="lg" className="px-6">
                <LocationIcon className="w-5 h-5" />
                Schiedam
              </Button>
            </Link>
            <Link href="/rotterdam/vlaardingen">
              <Button variant="outline" size="lg" className="px-6">
                <LocationIcon className="w-5 h-5" />
                Vlaardingen
              </Button>
            </Link>
            <Link href="/rotterdam/capelle">
              <Button variant="outline" size="lg" className="px-6">
                <LocationIcon className="w-5 h-5" />
                Capelle
              </Button>
            </Link>
            <Link href="/rotterdam/maassluis">
              <Button variant="outline" size="lg" className="px-6">
                <LocationIcon className="w-5 h-5" />
                Maassluis
              </Button>
            </Link>
            <Link href="/rotterdam/spijkenisse">
              <Button variant="outline" size="lg" className="px-6">
                <LocationIcon className="w-5 h-5" />
                Spijkenisse
              </Button>
            </Link>
            <Link href="/rotterdam/hoogvliet">
              <Button variant="outline" size="lg" className="px-6">
                <LocationIcon className="w-5 h-5" />
                Hoogvliet
              </Button>
            </Link>
            <Link href="/rotterdam/ijsselmonde">
              <Button variant="outline" size="lg" className="px-6">
                <LocationIcon className="w-5 h-5" />
                IJsselmonde
              </Button>
            </Link>
            <Link href="/rotterdam/krimpen">
              <Button variant="outline" size="lg" className="px-6">
                <LocationIcon className="w-5 h-5" />
                Krimpen a/d IJssel
              </Button>
            </Link>
            <Link href="/rotterdam/berkel">
              <Button variant="outline" size="lg" className="px-6">
                <LocationIcon className="w-5 h-5" />
                Berkel en Rodenrijs
              </Button>
            </Link>
            <Link href="/rotterdam/bergschenhoek">
              <Button variant="outline" size="lg" className="px-6">
                <LocationIcon className="w-5 h-5" />
                Bergschenhoek
              </Button>
            </Link>
            <Link href="/rotterdam/bleiswijk">
              <Button variant="outline" size="lg" className="px-6">
                <LocationIcon className="w-5 h-5" />
                Bleiswijk
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="px-4 sm:px-6 py-16 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-4">
            Onze diensten
          </h2>
          <p className="text-gray-600 text-center mb-10 max-w-xl mx-auto">
            Professionele dienstverlening bij jou in de buurt
          </p>

          <div className="grid sm:grid-cols-3 gap-6">
            <ServiceCard
              icon={<ScissorsIcon className="w-6 h-6" />}
              title="Herenkapper"
              description="Professionele knipbeurt en baardverzorging"
              price="Vanaf €35"
              href="/rotterdam/ridderkerk/herenkapper"
            />
            <ServiceCard
              icon={<ScissorsIcon className="w-6 h-6" />}
              title="Dameskapper"
              description="Knippen en stylen voor alle haarlengtes"
              price="Vanaf €45"
              href="/rotterdam/ridderkerk/dameskapper"
            />
            <ServiceCard
              icon={<CleaningIcon className="w-6 h-6" />}
              title="Schoonmaak"
              description="Basisschoonmaak, ramen en meer"
              price="Vanaf €75"
              href="/rotterdam/ridderkerk/schoonmaak"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 sm:px-6 py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-12">
            Zo werkt het
          </h2>

          <div className="grid sm:grid-cols-3 gap-8">
            <FeatureCard
              step={1}
              icon={<CalendarCheckIcon className="w-6 h-6" />}
              title="Kies dienst & moment"
              description="Selecteer wat je nodig hebt en wanneer het uitkomt."
            />
            <FeatureCard
              step={2}
              icon={<CreditCardIcon className="w-6 h-6" />}
              title="Betaal veilig"
              description="Transparante prijs vooraf. Betaal met iDEAL of kaart."
            />
            <FeatureCard
              step={3}
              icon={<HomeIcon className="w-6 h-6" />}
              title="Wij regelen de rest"
              description="Een professional komt op het afgesproken moment bij je thuis."
            />
          </div>
        </div>
      </section>

      {/* Areas Section */}
      <section className="px-4 sm:px-6 py-16 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-4">
            Actieve gebieden
          </h2>
          <p className="text-gray-600 text-center mb-10">
            BoekDichtbij is beschikbaar in de volgende regio&apos;s
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AreaCard href="/rotterdam/ridderkerk" name="Ridderkerk" />
            <AreaCard href="/rotterdam/barendrecht" name="Barendrecht" />
            <AreaCard href="/rotterdam/zuid" name="Rotterdam-Zuid" />
            <AreaCard href="/rotterdam/west" name="Rotterdam-West" />
            <AreaCard href="/rotterdam/schiedam" name="Schiedam" />
            <AreaCard href="/rotterdam/vlaardingen" name="Vlaardingen" />
            <AreaCard href="/rotterdam/capelle" name="Capelle a/d IJssel" />
            <AreaCard href="/rotterdam/maassluis" name="Maassluis" />
            <AreaCard href="/rotterdam/spijkenisse" name="Spijkenisse" />
            <AreaCard href="/rotterdam/hoogvliet" name="Hoogvliet" />
            <AreaCard href="/rotterdam/ijsselmonde" name="IJsselmonde" />
            <AreaCard href="/rotterdam/krimpen" name="Krimpen a/d IJssel" />
            <AreaCard href="/rotterdam/berkel" name="Berkel en Rodenrijs" />
            <AreaCard href="/rotterdam/bergschenhoek" name="Bergschenhoek" />
            <AreaCard href="/rotterdam/bleiswijk" name="Bleiswijk" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-6 py-8 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary-500 rounded flex items-center justify-center">
                <HomeServiceIcon className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white">BoekDichtbij</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400">
              <Link href="/rotterdam/ridderkerk" className="hover:text-white transition-colors">Ridderkerk</Link>
              <Link href="/rotterdam/barendrecht" className="hover:text-white transition-colors">Barendrecht</Link>
              <Link href="/rotterdam/zuid" className="hover:text-white transition-colors">Rotterdam-Zuid</Link>
              <Link href="/rotterdam/west" className="hover:text-white transition-colors">Rotterdam-West</Link>
              <Link href="/rotterdam/schiedam" className="hover:text-white transition-colors">Schiedam</Link>
              <Link href="/rotterdam/vlaardingen" className="hover:text-white transition-colors">Vlaardingen</Link>
              <Link href="/rotterdam/capelle" className="hover:text-white transition-colors">Capelle</Link>
              <Link href="/rotterdam/maassluis" className="hover:text-white transition-colors">Maassluis</Link>
              <Link href="/rotterdam/spijkenisse" className="hover:text-white transition-colors">Spijkenisse</Link>
              <Link href="/rotterdam/hoogvliet" className="hover:text-white transition-colors">Hoogvliet</Link>
              <Link href="/rotterdam/ijsselmonde" className="hover:text-white transition-colors">IJsselmonde</Link>
              <Link href="/rotterdam/krimpen" className="hover:text-white transition-colors">Krimpen</Link>
              <Link href="/rotterdam/berkel" className="hover:text-white transition-colors">Berkel</Link>
              <Link href="/rotterdam/bergschenhoek" className="hover:text-white transition-colors">Bergschenhoek</Link>
              <Link href="/rotterdam/bleiswijk" className="hover:text-white transition-colors">Bleiswijk</Link>
            </div>
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} BoekDichtbij
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
  icon,
  title,
  description,
  price,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  price: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-primary-500 hover:shadow-lg transition-all"
    >
      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 text-primary-600 group-hover:bg-primary-500 group-hover:text-white transition-colors">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-600 text-sm mb-3">{description}</p>
      <p className="text-primary-600 font-medium">{price}</p>
    </Link>
  );
}

function AreaCard({ href, name }: { href: string; name: string }) {
  return (
    <Link
      href={href}
      className="group bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-primary-500 hover:shadow-lg transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center group-hover:bg-primary-500 transition-colors">
          <LocationIcon className="w-6 h-6 text-primary-600 group-hover:text-white transition-colors" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{name}</h3>
          <p className="text-gray-600 text-sm">Kapper & schoonmaak</p>
        </div>
      </div>
    </Link>
  );
}

function HomeServiceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function LocationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ScissorsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
    </svg>
  );
}

function CleaningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
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
