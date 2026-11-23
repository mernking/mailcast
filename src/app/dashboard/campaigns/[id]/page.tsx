import { CampaignEditor } from "@/components/app/campaigns/campaign-editor";

export default async function CampaignEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CampaignEditor campaignId={id} />;
}
