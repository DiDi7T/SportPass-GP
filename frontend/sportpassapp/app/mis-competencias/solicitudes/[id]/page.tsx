import NotificationRequestDetail from "@/components/notification-request-detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const instant = false;

export default async function NotificationRequestPage({ params }: PageProps) {
  const { id } = await params;
  return <NotificationRequestDetail requestId={id} />;
}
