import type { Metadata } from "next";
import DameskapperBooking from "@/components/booking/DameskapperBooking";

export const metadata: Metadata = {
  title: "Dameskapper in Berkel en Rodenrijs | BoekDichtbij",
  description: "Boek een professionele dameskapper in Berkel en Rodenrijs. Knippen en stylen vanaf €45, transparante prijzen.",
  keywords: "dameskapper Berkel en Rodenrijs, kapper Berkel en Rodenrijs, dames knipbeurt boeken",
};

export default function DameskapperBerkelPage() {
  return (
    <>
      <div className="sr-only"><h1>Dameskapper in Berkel en Rodenrijs</h1></div>
      <DameskapperBooking citySlug="rotterdam" areaSlug="berkel" areaLabel="Berkel en Rodenrijs" serviceSlug="dameskapper" />
    </>
  );
}
