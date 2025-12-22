import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "サプリCSVセンター",
    description: "AI-powered extraction for supplement application forms",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ja">
            <body suppressHydrationWarning={true}>
                {children}
            </body>
        </html>
    );
}
