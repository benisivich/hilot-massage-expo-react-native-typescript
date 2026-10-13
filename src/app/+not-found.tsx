import { replace } from '@/lib/nav';
import { Button, Empty, Screen } from '@/components/ui';

export default function NotFoundScreen() {
  return (
    <Screen title="Page missing">
      <Empty title="That screen is not in Hilotcare." body="Head back to the start and choose a client or therapist desk." />
      <Button label="Back to start" onPress={() => replace('/')} />
    </Screen>
  );
}
