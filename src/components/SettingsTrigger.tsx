import { getCurrentUser } from "@/lib/dal";
import { Settings } from "@/components/Settings";
import type { Lang } from "@/lib/i18n/dictionary";

export async function SettingsTrigger({ lang }: { lang: Lang }) {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <Settings
      lang={lang}
      user={{ name: user.name, email: user.email }}
      degreeName={user.degreeName}
      creditsRequired={user.creditsRequired}
      google={{
        connected: !!user.googleRefreshToken,
        syncLectures: user.syncLecturesToCalendar,
        syncHomework: user.syncHomeworkToTasks,
      }}
    />
  );
}
