import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | FitCore" },
      {
        name: "description",
        content: "How FitCore stores fitness records and handles backups and optional AI requests.",
      },
    ],
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <main className="mx-auto max-w-2xl space-y-8 px-5 py-8 sm:px-8 sm:py-12">
      <header className="space-y-3">
        <Link to="/" className="inline-flex min-h-11 items-center text-primary underline">
          Back to FitCore
        </Link>
        <h1 className="text-3xl font-bold sm:text-4xl">FitCore Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Updated November 16, 2026</p>
      </header>

      <div className="space-y-7 leading-relaxed text-muted-foreground">
        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Fitness records and app settings
          </h2>
          <p>
            FitCore saves the information you enter, such as workouts, nutrition, sleep, recovery
            check-ins, progress photos, and profile settings, in browser storage on the device you
            use. Core tracking works without a FitCore account. FitCore does not automatically sync
            your tracking history across devices.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">AI features</h2>
          <p>
            Using Jarvis or an AI estimate can send your message, the details you enter, and
            relevant fitness context through FitCore&apos;s server to the configured AI provider.
            Providers can include Lovable&apos;s AI gateway, Google Gemini, or Groq. Their privacy
            terms apply to the information they receive. Selecting a meal photo for an AI estimate
            sends the photo through FitCore&apos;s server to Gemini before you save the meal. Voice
            input uses your browser&apos;s speech recognition, which may send audio to a speech
            service. If you submit the transcript to Jarvis, the transcript is treated as your
            message.
          </p>
          <p>
            Jarvis activity, text associated with saved records, and AI preferences can stay on your
            device. If you enter your own AI provider keys, FitCore can save them in this browser.
            Saved keys can accompany AI requests to FitCore&apos;s server for provider
            authentication. You can remove your keys in Jarvis settings.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">WHOOP connection</h2>
          <p>
            Where the connection is enabled, selecting Connect WHOOP sends you to WHOOP for
            authorization. FitCore stores the connection and its encrypted authorization credentials
            on a private database, and uses an essential browser cookie to recognize your FitCore
            integration session. The connection screens in this release do not import WHOOP health
            records. Disconnect WHOOP removes FitCore&apos;s stored credentials and attempts to
            revoke access at WHOOP. If that attempt fails, you can also remove the connection in
            WHOOP.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Hosting and diagnostics</h2>
          <p>
            FitCore is hosted on Vercel. Hosting services receive information needed to serve
            requests, such as IP address, browser information, and requested pages. The app also
            loads fonts from Google Fonts and can report technical errors when error reporting is
            available.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Export and deletion</h2>
          <p>
            In Settings, use Export to download a JSON backup. It can contain personal information
            and is readable by anyone with access to the file. Keep it somewhere private and delete
            copies you no longer want.
          </p>
          <p>
            Reset all data replaces your active tracking data with FitCore defaults. Browser storage
            can still contain a previous recovery copy, old migrated data, AI keys, and browser
            preferences. To remove those copies and settings from this installation, clear FitCore
            site data in your browser or installed web app. Downloaded backups and information
            already sent to an AI provider are managed separately.
          </p>
        </section>
      </div>
    </main>
  );
}
