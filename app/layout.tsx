import {Main} from '@cooperateDesign';
import './globals.css';
import { Metadata } from 'next';
//import { authOptions } from './api/auth/[...nextauth]/route';
//import { getServerSession } from 'next-auth';
//import { redirect } from 'next/navigation';
//import "./globals.css";
export const metadata: Metadata = {
  title: "hmySearch - by Haaremy",
  description: "Websuche im deutschen und englischen Raum. Website und Implementierung von @Haaremy.",
   icons: {
    icon: "/logo_wk.svg",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  //const session = await getServerSession(authOptions);

  // WICHTIG:
  // Wenn bereits eingeloggt → sofort weg von auth.*
  //if (session?.user) {
  //  redirect("https://account.haaremy.de");
  //}

  return (
    <html lang="de" className='dark'>
      <body>
        <Main>
          {children}
        </Main>
      </body>
    </html>
  );
}
