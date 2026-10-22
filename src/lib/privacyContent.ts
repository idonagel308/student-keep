import type { Lang } from "@/lib/i18n/dictionary";

export type PrivacySection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type PrivacyContent = {
  title: string;
  updated: string;
  intro: string;
  sections: PrivacySection[];
};

// Keep in sync with what the app actually does (see README "Privacy").
// If a feature starts collecting something new, update this and the date.
export const PRIVACY_UPDATED = "2026-10-22";

export const privacyContent: Record<Lang, PrivacyContent> = {
  en: {
    title: "Privacy note",
    updated: "Last updated: 22 October 2026",
    intro:
      "Student Keep is a small, invite-only project run by an individual student, not a company. There are no ads, no analytics and no tracking. This page explains, in plain language, what the site stores about you and what happens to it.",
    sections: [
      {
        heading: "What we store",
        bullets: [
          "Your account: your email address, an optional name, and your password. The password is stored only as a one-way hash, so nobody (including the person who runs the site) can read it.",
          "Your coursework: semesters, courses (names, numbers, credits, lecture schedules and times, final exam dates, grades), lectures, homework (names, details, due dates, typed answers), your degree name and required credits.",
          "Files you upload: PDFs such as assignments, answers and lecture summaries.",
          "Preferences: your language (a cookie) and light/dark theme (your browser's local storage).",
          "Short-lived security records: when a login or signup attempt fails, a record containing your IP address and email is kept to block password guessing. These expire after 15 minutes and are purged automatically.",
          "Hosting logs: the hosting provider may keep standard server logs (such as IP addresses and request times) for a limited period.",
        ],
      },
      {
        heading: "Who can see it",
        paragraphs: [
          "Your data is private to your account: other users cannot see it, and nothing is shared between accounts. The person who runs the site has technical access to the database and file storage because that is needed to operate it, and does not look at your content except when needed to keep the service working.",
          "Your data is never sold or used for advertising.",
        ],
      },
      {
        heading: "Services that handle your data",
        paragraphs: [
          "To run the site we rely on a few providers, who process data on our behalf: Vercel (hosting), Neon (database), Cloudflare R2 or Vercel Blob (file storage), and Google (only if you choose to connect it, see below). These providers may store data in data centres outside your country.",
        ],
      },
      {
        heading: "Google Calendar and Tasks (optional)",
        paragraphs: [
          "If you connect your Google account in Settings, the site can create calendar events for your lectures and final exams, and Google Tasks for your homework. It asks Google only for permission to manage calendar events and tasks, and sends only what is needed for each item: the course name, lecture number and title, dates and times, homework name, details and due date.",
          "Sync is one-way: the site writes to Google and never reads your calendar or tasks. Your Google access tokens are stored encrypted. Use Disconnect in Settings at any time to stop syncing and revoke the site's access (events already created stay in your Google account until you delete them). You can also remove access at myaccount.google.com/permissions.",
        ],
      },
      {
        heading: "Cookies and local storage",
        bullets: [
          "Session cookie (essential): keeps you signed in for up to 30 days. It is only readable by the server.",
          "Language cookie (functional): remembers English or Hebrew for up to a year.",
          "Google connection cookie (essential, temporary): lives for 10 minutes while you connect Google, to protect against forged requests.",
          "Theme setting (local storage): remembers light or dark mode in your browser.",
          "There are no tracking or advertising cookies, which is why there is no cookie banner.",
        ],
      },
      {
        heading: "Keeping and deleting your data",
        paragraphs: [
          "Your data stays until you delete it. Deleting a course, semester or file removes it, including any uploaded PDFs. In Settings, Delete account permanently removes your account, all your coursework, your uploaded files and any Google Calendar events and Tasks the site created, and disconnects Google. This cannot be undone. Our database host may keep backups for a short time before they expire.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "You can view, edit and delete your data yourself inside the app. If you want a copy of your data, want something corrected that you cannot change yourself, or have any question or complaint about privacy, contact the person who gave you your invite code.",
        ],
      },
      {
        heading: "Security",
        paragraphs: [
          "The site is served over HTTPS only, passwords are hashed, Google tokens are encrypted, login attempts are rate limited, and every request checks that the data belongs to the signed-in user. No system is perfectly secure; if something goes wrong with your data, you will be told.",
        ],
      },
      {
        heading: "Age",
        paragraphs: ["Student Keep is meant for university students and is not intended for children under 16."],
      },
      {
        heading: "Changes",
        paragraphs: ["If this note changes, the date at the top will be updated."],
      },
    ],
  },
  he: {
    title: "הודעת פרטיות",
    updated: "עודכן לאחרונה: 22 באוקטובר 2026",
    intro:
      "Student Keep הוא פרויקט קטן בהזמנה בלבד, שמופעל על ידי סטודנט ולא על ידי חברה. אין פרסומות, אין ניתוח שימוש ואין מעקב. הדף הזה מסביר בשפה פשוטה איזה מידע האתר שומר עליך ומה קורה איתו.",
    sections: [
      {
        heading: "מה נשמר",
        bullets: [
          "החשבון שלך: כתובת האימייל, שם (אופציונלי) והסיסמה. הסיסמה נשמרת רק כגיבוב חד-כיווני, ולכן אף אחד (כולל מי שמפעיל את האתר) לא יכול לקרוא אותה.",
          "הלימודים שלך: סמסטרים, קורסים (שמות, מספרים, נקודות זכות, לוח הרצאות ושעות, תאריכי בחינה סופית, ציונים), הרצאות, שיעורי בית (שמות, פרטים, מועדי הגשה, תשובות שהקלדת), שם התואר ונקודות הזכות הנדרשות.",
          "קבצים שהעלית: קובצי PDF כמו מטלות, תשובות וסיכומי הרצאות.",
          "העדפות: השפה שלך (עוגייה) ומצב בהיר/כהה (באחסון המקומי של הדפדפן).",
          "רישומי אבטחה קצרי טווח: כשניסיון התחברות או הרשמה נכשל, נשמר רישום עם כתובת ה-IP והאימייל כדי לחסום ניחוש סיסמאות. הרישומים פגים אחרי 15 דקות ונמחקים אוטומטית.",
          "יומני אחסון: ספק האחסון עשוי לשמור יומני שרת רגילים (כמו כתובות IP וזמני בקשות) לתקופה מוגבלת.",
        ],
      },
      {
        heading: "מי יכול לראות",
        paragraphs: [
          "המידע שלך פרטי לחשבון שלך: משתמשים אחרים לא יכולים לראות אותו ושום דבר לא משותף בין חשבונות. למי שמפעיל את האתר יש גישה טכנית למסד הנתונים ולאחסון הקבצים, כי זה נדרש להפעלת האתר, והוא לא צופה בתוכן שלך אלא אם זה נחוץ כדי שהשירות ימשיך לעבוד.",
          "המידע שלך לא נמכר ולא משמש לפרסום.",
        ],
      },
      {
        heading: "שירותים שמטפלים במידע",
        paragraphs: [
          "להפעלת האתר אנחנו נעזרים בכמה ספקים שמעבדים מידע בשמנו: Vercel (אחסון האתר), Neon (מסד נתונים), Cloudflare R2 או Vercel Blob (אחסון קבצים), ו-Google (רק אם בחרת לחבר אותו, ראה למטה). ייתכן שהספקים האלה שומרים מידע במרכזי נתונים מחוץ למדינה שלך.",
        ],
      },
      {
        heading: "יומן Google ו-Google Tasks (אופציונלי)",
        paragraphs: [
          "אם תחבר את חשבון Google שלך בהגדרות, האתר יוכל ליצור אירועי יומן להרצאות ולבחינות הסופיות, ומשימות ב-Google Tasks לשיעורי הבית. האתר מבקש מ-Google הרשאה לנהל אירועי יומן ומשימות בלבד, ושולח רק את מה שנחוץ לכל פריט: שם הקורס, מספר וכותרת ההרצאה, תאריכים ושעות, שם שיעור הבית, פרטיו ומועד ההגשה.",
          "הסנכרון חד-כיווני: האתר כותב ל-Google ואף פעם לא קורא את היומן או המשימות שלך. אסימוני הגישה שלך ל-Google נשמרים מוצפנים. אפשר ללחוץ על ניתוק בהגדרות בכל רגע כדי להפסיק את הסנכרון ולבטל את הגישה של האתר (אירועים שכבר נוצרו יישארו בחשבון Google שלך עד שתמחק אותם). אפשר גם להסיר את הגישה בכתובת myaccount.google.com/permissions.",
        ],
      },
      {
        heading: "עוגיות ואחסון מקומי",
        bullets: [
          "עוגיית התחברות (הכרחית): משאירה אותך מחובר עד 30 יום. רק השרת יכול לקרוא אותה.",
          "עוגיית שפה (פונקציונלית): זוכרת עברית או אנגלית עד שנה.",
          "עוגיית חיבור ל-Google (הכרחית, זמנית): קיימת 10 דקות בזמן החיבור ל-Google, כדי להגן מפני בקשות מזויפות.",
          "הגדרת עיצוב (אחסון מקומי): זוכרת מצב בהיר או כהה בדפדפן שלך.",
          "אין עוגיות מעקב או פרסום, ולכן אין באנר עוגיות.",
        ],
      },
      {
        heading: "שמירה ומחיקה של המידע",
        paragraphs: [
          "המידע שלך נשאר עד שתמחק אותו. מחיקת קורס, סמסטר או קובץ מסירה אותם, כולל קובצי PDF שהועלו. בהגדרות, מחיקת חשבון מסירה לצמיתות את החשבון, כל הלימודים שלך, הקבצים שהעלית וכל אירועי היומן והמשימות ב-Google שהאתר יצר, ומנתקת את Google. אי אפשר לבטל את הפעולה. ספק מסד הנתונים עשוי לשמור גיבויים לזמן קצר עד שהם פגים.",
        ],
      },
      {
        heading: "הזכויות שלך",
        paragraphs: [
          "אפשר לצפות במידע, לערוך ולמחוק אותו בעצמך בתוך האפליקציה. אם תרצה עותק של המידע, תיקון של משהו שאי אפשר לשנות בעצמך, או שיש לך שאלה או תלונה בנושא פרטיות, פנה למי שנתן לך את קוד ההזמנה.",
        ],
      },
      {
        heading: "אבטחה",
        paragraphs: [
          "האתר מוגש באמצעות HTTPS בלבד, הסיסמאות מגובבות, אסימוני Google מוצפנים, ניסיונות התחברות מוגבלים, וכל בקשה בודקת שהמידע שייך למשתמש המחובר. אין מערכת מאובטחת לחלוטין; אם משהו ישתבש עם המידע שלך, תקבל על כך הודעה.",
        ],
      },
      {
        heading: "גיל",
        paragraphs: ["Student Keep מיועד לסטודנטים באוניברסיטה ואינו מיועד לילדים מתחת לגיל 16."],
      },
      {
        heading: "שינויים",
        paragraphs: ["אם ההודעה הזו תשתנה, התאריך בראש הדף יתעדכן."],
      },
    ],
  },
};
