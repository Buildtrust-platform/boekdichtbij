import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Diensten in Maassluis | BoekDichtbij",
  description: "Boek eenvoudig een kapper of schoonmaakdienst in Maassluis. Transparante prijzen, veilig betalen en wij regelen de rest.",
  keywords: "kapper Maassluis, schoonmaak Maassluis, diensten Maassluis, lokale diensten",
};

export default function MaassluisAreaPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 via-white to-white">
      <header className="px-4 py-4 sm:px-6 border-b border-gray-100">
        <nav className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center"><HomeServiceIcon className="w-5 h-5 text-white" /></div>
            <span className="font-bold text-xl text-gray-900">BoekDichtbij</span>
          </Link>
        </nav>
      </header>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium mb-4"><CheckIcon className="w-4 h-4" />Actief in dit gebied</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Diensten in Maassluis</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">BoekDichtbij is actief in Maassluis. Boek eenvoudig een kapper of schoonmaakdienst, op een moment dat jou uitkomt.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Link href="/rotterdam/maassluis/herenkapper" className="group bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-primary-500 hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-500 transition-colors"><ScissorsIcon className="w-6 h-6 text-primary-600 group-hover:text-white transition-colors" /></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Herenkapper</h2>
            <p className="text-gray-600 text-sm mb-4">Professionele knipbeurt en baardverzorging.</p>
            <div className="flex items-center justify-between"><span className="text-sm text-gray-500">Vanaf €35</span><span className="text-primary-600 font-medium text-sm group-hover:translate-x-1 transition-transform">Bekijk →</span></div>
          </Link>
          <Link href="/rotterdam/maassluis/dameskapper" className="group bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-primary-500 hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-500 transition-colors"><ScissorsIcon className="w-6 h-6 text-primary-600 group-hover:text-white transition-colors" /></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Dameskapper</h2>
            <p className="text-gray-600 text-sm mb-4">Knippen, stylen en verzorging voor alle haarlengtes.</p>
            <div className="flex items-center justify-between"><span className="text-sm text-gray-500">Vanaf €45</span><span className="text-primary-600 font-medium text-sm group-hover:translate-x-1 transition-transform">Bekijk →</span></div>
          </Link>
          <Link href="/rotterdam/maassluis/schoonmaak" className="group bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-primary-500 hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-500 transition-colors"><CleaningIcon className="w-6 h-6 text-primary-600 group-hover:text-white transition-colors" /></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Schoonmaak</h2>
            <p className="text-gray-600 text-sm mb-4">Basisschoonmaak, ramen en grote schoonmaak aan huis.</p>
            <div className="flex items-center justify-between"><span className="text-sm text-gray-500">Vanaf €75</span><span className="text-primary-600 font-medium text-sm group-hover:translate-x-1 transition-transform">Bekijk →</span></div>
          </Link>
        </div>
        <div className="bg-gray-50 rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">Zo werkt het</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="text-center"><div className="w-10 h-10 bg-primary-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">1</div><h3 className="font-medium text-gray-900 mb-1">Kies dienst & tijd</h3><p className="text-sm text-gray-600">Selecteer wat je nodig hebt en wanneer het uitkomt.</p></div>
            <div className="text-center"><div className="w-10 h-10 bg-primary-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">2</div><h3 className="font-medium text-gray-900 mb-1">Betaal veilig</h3><p className="text-sm text-gray-600">Transparante prijs vooraf. Betaal met iDEAL of kaart.</p></div>
            <div className="text-center"><div className="w-10 h-10 bg-primary-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">3</div><h3 className="font-medium text-gray-900 mb-1">Wij regelen de rest</h3><p className="text-sm text-gray-600">Een professional komt op het afgesproken moment.</p></div>
          </div>
        </div>
      </div>
      <footer className="px-4 py-6 border-t border-gray-100 mt-auto">
        <div className="max-w-4xl mx-auto text-center text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-700">BoekDichtbij</Link>{" · "}<Link href="/rotterdam/vlaardingen" className="hover:text-gray-700">Vlaardingen</Link>{" · "}<Link href="/rotterdam/schiedam" className="hover:text-gray-700">Schiedam</Link>{" · "}<Link href="/rotterdam/maassluis" className="hover:text-gray-700">Maassluis</Link>
        </div>
      </footer>
    </main>
  );
}

function HomeServiceIcon({ className }: { className?: string }) { return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>); }
function CheckIcon({ className }: { className?: string }) { return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>); }
function ScissorsIcon({ className }: { className?: string }) { return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" /></svg>); }
function CleaningIcon({ className }: { className?: string }) { return (<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>); }
