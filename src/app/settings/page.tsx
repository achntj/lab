import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HotkeySettingsForm } from "@/components/hotkeys/settings-form";
import { importBackup } from "@/app/actions";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Download your data and configure keyboard shortcuts for navigation."
      />

      <Card>
        <CardHeader>
          <CardTitle>Data export</CardTitle>
          <CardDescription>Download a JSON backup of your records.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Includes tasks, notes, bookmarks, timers, finances, subscriptions, reminders, and search
            records.
          </p>
          <Button asChild>
            <a href="/api/export" download>
              Export data (.json)
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data import</CardTitle>
          <CardDescription>Restore from a JSON backup. Existing items are kept; duplicates are skipped.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={importBackup} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Input name="backup" type="file" accept=".json,application/json" required />
            <Button type="submit">Import backup</Button>
          </form>
        </CardContent>
      </Card>

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
