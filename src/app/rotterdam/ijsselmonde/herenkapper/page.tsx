import type { Metadata } from "next";
import HerenkapperBooking from "@/components/booking/HerenkapperBooking";

export const metadata: Metadata = {
  title: "Herenkapper in IJsselmonde | BoekDichtbij",
  description: "Boek een professionele herenkapper in IJsselmonde. Knipbeurt vanaf €35, transparante prijzen, veilig betalen.",
  keywords: "herenkapper IJsselmonde, kapper IJsselmonde, knipbeurt boeken",
};

export default function HerenkapperIJsselmondePage() {
  return (
    <>
      <div className="sr-only"><h1>Herenkapper in IJsselmonde</h1></div>
      <HerenkapperBooking citySlug="rotterdam" areaSlug="ijsselmonde" areaLabel="IJsselmonde" serviceSlug="herenkapper" />
    </>
  );
}
