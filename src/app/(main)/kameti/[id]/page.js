import { KametiDetailView } from "@/components/kameti/kameti-detail-view";

export default async function KametiDetailPage({ params }) {
  const { id } = await params;
  return <KametiDetailView rotationId={id} />;
}
