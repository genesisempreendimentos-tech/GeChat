import PanelPlaceholderPage from '@/components/PanelPlaceholderPage';

interface VitrineItemPageProps {
  itemNumber: number;
}

export default function VitrineItemPage({ itemNumber }: VitrineItemPageProps) {
  return (
    <PanelPlaceholderPage
      title={`Item ${itemNumber}`}
      panelName="Vitrine"
    />
  );
}
