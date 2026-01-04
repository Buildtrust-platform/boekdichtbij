import type { Metadata } from "next";
import DameskapperBooking from "@/components/booking/DameskapperBooking";

export const metadata: Metadata = {
  title: "Dameskapper in IJsselmonde | BoekDichtbij",
  description: "Boek een professionele dameskapper in IJsselmonde. Knippen en stylen vanaf €45, transparante prijzen.",
  keywords: "dameskapper IJsselmonde, kapper IJsselmonde, dames knipbeurt boeken",
};

export default function DameskapperIJsselmondePage() {
  return (
    <>
      <div className="sr-only"><h1>Dameskapper in IJsselmonde</h1></div>
      <DameskapperBooking citySlug="rotterdam" areaSlug="ijsselmonde" areaLabel="IJsselmonde" serviceSlug="dameskapper" />
    </>
  );
}
