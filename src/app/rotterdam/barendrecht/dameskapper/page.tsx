import type { Metadata } from "next";
import DameskapperBooking from "@/components/booking/DameskapperBooking";

export const metadata: Metadata = {
  title: "Dameskapper in Barendrecht | BoekDichtbij",
  description:
    "Boek een professionele dameskapper in Barendrecht. Knippen en stylen voor alle haarlengtes, transparante prijzen vanaf €45. Kies een tijdvak dat jou uitkomt.",
  keywords: "dameskapper Barendrecht, kapper Barendrecht, dames knipbeurt boeken, dameskapper boeken",
};

export default function DameskapperBarendrechtPage() {
  return (
    <>
      <div className="sr-only">
        <h1>Dameskapper in Barendrecht</h1>
        <p>Boek een professionele dameskapper in Barendrecht. Knippen en stylen voor alle haarlengtes, met transparante prijzen.</p>
      </div>
      <DameskapperBooking
        citySlug="rotterdam"
        areaSlug="barendrecht"
        areaLabel="Barendrecht"
        serviceSlug="dameskapper"
      />
    </>
  );
}
