import type { Metadata } from "next";
import DameskapperBooking from "@/components/booking/DameskapperBooking";

export const metadata: Metadata = {
  title: "Dameskapper in Schiedam | BoekDichtbij",
  description: "Boek een professionele dameskapper in Schiedam. Knippen en stylen vanaf €45, transparante prijzen.",
  keywords: "dameskapper Schiedam, kapper Schiedam, dames knipbeurt boeken",
};

export default function DameskapperSchiedamPage() {
  return (
    <>
      <div className="sr-only"><h1>Dameskapper in Schiedam</h1></div>
      <DameskapperBooking citySlug="rotterdam" areaSlug="schiedam" areaLabel="Schiedam" serviceSlug="dameskapper" />
    </>
  );
}
