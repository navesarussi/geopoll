import { pageLang } from "@/lib/i18n";
export const metadata = { title: "Privacy (draft) – GeoPoll" };
export const dynamic = "force-dynamic";
export default async function Privacy({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang, dir } = await pageLang((await searchParams).lang);
  if (lang === "en") return <PrivacyEn />;
  return (
    <main lang={lang} dir={dir}>
      <div className="badge">טיוטה – ממתינה לבדיקת עורך דין</div>
      <h1>מה נשמר בגרסת הבטא</h1>
      <p>זו גרסת בדיקה. הנתונים עלולים להתאפס, וזו לא הצבעה רשמית.</p>
      <h2>התחברות</h2>
      <p>ההתחברות עם Google משמשת רק כדי לוודא שכל חשבון מקבל כרטיס הצבעה אחד בחודש. אנחנו לא שומרים את כתובת המייל או את השם מ-Google. נשמרת רק "טביעה" מוצפנת (HMAC) של מזהה החשבון יחד עם החודש. החיבור נשמר בעוגיית התחברות בדפדפן.</p>
      <h2>הצבעה חשאית</h2>
      <p>כרטיס ההצבעה נחתם בחתימה עיוורת: השרת שמזהה אתכם לא רואה את הכרטיס. ההצבעה נשלחת בלי עוגיית התחברות, ונשמרים רק מזהה חד-פעמי (nullifier), הבחירה, החודש והיום. אין בטבלה הזו שום מזהה של משתמש. הכרטיס עצמו נשמר רק במכשיר שלכם.</p>
      <p><b>מגבלות הבטא:</b> השרתים של שני החלקים פועלים באותה פריסה ורואים כתובות IP. עדיין אין ממסר מסתיר IP ואין הוכחות אפס-ידע, ולכן מפעיל המערכת יכול תאורטית לקשר לפי זמן או IP. הפילוחים הם ללא אימות.</p>
      <h2>סקר עמדות פומבי, דיונים ופרופיל</h2>
      <p>רשות בלבד. ברירת המחדל היא פרסום תחת הפרופיל שלכם (שם תצוגה, ביו קצר ואווטאר מתוך סט קבוע). השם מ-Google מוצע ואפשר לשנות אותו. המייל לעולם לא מוצג. בפרסום הראשון תתבקשו לאשר שהעמדה תהיה פומבית. עמדה פוליטית היא מידע רגיש.</p>
      <p>אפשר לבחור "לפרסם באנונימיות" לכל פרסום. אז יוצג כינוי קבוע לדיון, שהציבור לא יכול לקשר לפרופיל, ופרסומים אנונימיים לא מופיעים בדף הפרופיל. <b>מגבלה:</b> מפעיל המערכת שמחזיק את מפתחות ההצפנה יכול טכנית לקשר. אם תופעל "מעטפה חתומה" למודרציה, זיהוי כותב אנונימי יתאפשר רק עם מפתח שנשמר אופליין ובהליך משפטי.</p>
      <p>הפרופיל והפרסומים לא מקושרים בשום צורה להצבעה החשאית. אפשר למחוק כל פרסום בכל עת.</p>
      <h2>מה אין</h2>
      <p>אין פרסומות, אין trackers ואין מכירת מידע.</p>
      <p><a href={`/?lang=${lang}`}>חזרה</a></p>
    </main>
  );
}

/** English translation of the draft notice. The Hebrew text is authoritative (pending lawyer review). */
function PrivacyEn() {
  return (
    <main lang="en" dir="ltr">
      <div className="badge">Draft – pending legal review. The Hebrew version is authoritative.</div>
      <h1>What the beta stores</h1>
      <p>This is a test version. Data may be reset, and this is not an official vote.</p>
      <h2>Sign-in</h2>
      <p>Google sign-in is used only to make sure each account gets one ballot token per month. We do not store your Google email or name. Only an encrypted fingerprint (HMAC) of the account ID together with the month is kept. The session is kept in a sign-in cookie in your browser.</p>
      <h2>Secret ballot</h2>
      <p>The ballot token is signed with a blind signature: the server that identifies you never sees the token. The vote is sent without the sign-in cookie, and only a one-time identifier (nullifier), the choice, the month and the day are stored. That table contains no user identifier. The token itself is stored only on your device.</p>
      <p><b>Beta limitations:</b> both parts run in the same deployment and see IP addresses. There is no IP-hiding relay and no zero-knowledge proofs yet, so the operator could in theory link by time or IP. Breakdowns are unverified.</p>
      <h2>Public positions survey, discussions and profile</h2>
      <p>Optional. By default posts appear under your profile (display name, short bio and an avatar from a fixed set). The name from Google is suggested and can be changed. Your email is never shown. On your first post you will be asked to confirm that the position will be public. A political position is sensitive information.</p>
      <p>You can choose to post anonymously for any post. A stable per-discussion alias is then shown, which the public cannot link to your profile, and anonymous posts do not appear on your profile page. <b>Limitation:</b> an operator holding the encryption keys could technically link them. If a sealed moderation envelope is enabled, identifying an anonymous author will only be possible with an offline key and through legal process.</p>
      <p>The profile and posts are not linked in any way to the secret ballot. You can delete any post at any time.</p>
      <h2>What we don't do</h2>
      <p>No ads, no trackers, no selling of data.</p>
      <p><a href="/?lang=en">Back</a></p>
    </main>
  );
}
