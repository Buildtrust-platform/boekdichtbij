import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold mb-2">BoekDichtbij</h1>
        <p className="text-gray-600 mb-8">
          Boek een kapper bij jou in de buurt
        </p>

        <div className="space-y-3">
          <Link
            href="/boeken"
            className="block w-full bg-black text-white py-3 rounded hover:bg-gray-800"
          >
            Afspraak maken
          </Link>

          <Link
            href="/mijn-afspraken"
            className="block w-full border border-gray-300 py-3 rounded hover:bg-gray-50"
          >
            Mijn afspraken
          </Link>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <Link href="/login" className="hover:underline">
            Inloggen
          </Link>
          {" • "}
          <Link href="/register" className="hover:underline">
            Registreren
          </Link>
        </div>
      </div>
    </main>
  );
}
