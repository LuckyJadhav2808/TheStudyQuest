"use client";
import { Card, PageFrame } from "@/components/ui/misc";

export function PrivacyPage() {
  return (
    <PageFrame title="Privacy" subtitle="Your data stays on this device.">
      <Card className="overflow-y-auto">
        <div className="prose-sq max-w-2xl">
          <h2>What we store, and where</h2>
          <p>StudyQuest keeps notes, tasks, habits, progress, pets and settings in your browser's IndexedDB. Nothing is uploaded unless you choose to.</p>
          <h2>AI features</h2>
          <p>When you use an AI action, the text you send goes through this app's server route to the provider you picked. Your API key is stored locally, sent per request, and never logged.</p>
          <h2>Optional cloud sign-in</h2>
          <p>Firebase sign-in only exists if the site owner configured it. Guest Mode works without any account.</p>
          <h2>Your controls</h2>
          <ul><li>Export a full JSON backup any time from Settings.</li><li>Reset wipes every table on this device.</li><li>Notifications and persistent storage are opt-in.</li></ul>
        </div>
      </Card>
    </PageFrame>
  );
}
