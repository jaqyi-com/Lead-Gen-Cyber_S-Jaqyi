import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'JAQYI Lead Dashboard',
  description: 'Automated lead generation pipeline — AI-powered insights from Freelancer, Upwork, Reddit, Twitter/X, and LinkedIn.',
  openGraph: {
    title: 'JAQYI Lead Dashboard',
    description: 'Real-time buying-intent leads across 5 platforms, classified by Claude AI.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ background: '#08080e', color: '#f1f0ff', fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{ marginLeft: '220px', minHeight: '100vh', padding: '32px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
