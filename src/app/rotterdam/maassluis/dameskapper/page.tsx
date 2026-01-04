import type { Metadata } from "next";
import DameskapperBooking from "@/components/booking/DameskapperBooking";

export const metadata: Metadata = {
  title: "Dameskapper in Maassluis | BoekDichtbij",
  description: "Boek een professionele dameskapper in Maassluis. Knippen en stylen vanaf €45, transparante prijzen.",
  keywords: "dameskapper Maassluis, kapper Maassluis, dames knipbeurt boeken",
};

export default function DameskapperMaassluisPage() {
  return (
    <>
      <div className="sr-only"><h1>Dameskapper in Maassluis</h1></div>
      <DameskapperBooking citySlug="rotterdam" areaSlug="maassluis" areaLabel="Maassluis" serviceSlug="dameskapper" />
    </>
  );
}
