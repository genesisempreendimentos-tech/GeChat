import PanelPlaceholderPage from '@/components/PanelPlaceholderPage';

interface UserItemPageProps {
  itemNumber: number;
}

export default function UserItemPage({ itemNumber }: UserItemPageProps) {
  return (
    <PanelPlaceholderPage
      title={`Item ${itemNumber}`}
      panelName="User"
    />
  );
}
