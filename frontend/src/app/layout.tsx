import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider, themeInitScript } from "@/hooks/useTheme";
import { ChatStoreProvider } from "@/hooks/useChatStore";
import { StreamsProvider } from "@/hooks/useStreams";
import { ChatModeProvider } from "@/hooks/useChatMode";
import { SplitViewProvider } from "@/hooks/useSplitView";

/**
 * Type pairing: Plus Jakarta Sans for headings — its geometric, slightly
 * rounded forms echo the logo wordmark — with Inter for UI and body text, and
 * JetBrains Mono for model ids, API keys and terminal snippets.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-jb",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OptiAI",
  description:
    "One layer over every AI provider — route, optimize, and understand your model usage.",
  // The gradient mark on a square canvas; the old PNG was a crop that carried
  // the top of the wordmark along with it.
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
    apple: "/logo-mark.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d14" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the stored theme before first paint to avoid a light flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.variable} ${jakarta.variable} ${jetbrains.variable}`}>
        <ThemeProvider>
          <ChatStoreProvider>
            <StreamsProvider>
              <ChatModeProvider>
                <SplitViewProvider>
                  <AppShell>{children}</AppShell>
                </SplitViewProvider>
              </ChatModeProvider>
            </StreamsProvider>
          </ChatStoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
