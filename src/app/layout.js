import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import {
  THEME_STORAGE_KEY,
  resolveTheme,
} from "@/components/theme/theme-storage";

const inter = Inter({
  variable: "--font-app-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Smash Kameti Tracker",
  description: "Kameti turns, American splits, and group settlements",
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const initialTheme = resolveTheme(
    cookieStore.get(THEME_STORAGE_KEY)?.value,
  );

  return (
    <html
      lang="en"
      className={`${inter.variable} ${initialTheme} h-full`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-background text-sm leading-snug text-foreground antialiased"
        suppressHydrationWarning
      >
        <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
