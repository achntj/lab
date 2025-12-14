import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HotkeySettingsForm } from "@/components/hotkeys/settings-form";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure keyboard shortcuts for navigation and quick actions."
      />

      <Card>
        <CardHeader>
          <CardTitle>Hotkeys</CardTitle>
          <CardDescription>Override default combos. Use format like mod+k or mod+shift+n.</CardDescription>
        </CardHeader>
        <CardContent>
          <HotkeySettingsForm />
        </CardContent>
      </Card>
    </div>
  );
}
