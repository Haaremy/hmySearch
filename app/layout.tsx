import '@haaremy/hmydesign/index.css';
//import { authOptions } from './api/auth/[...nextauth]/route';
//import { getServerSession } from 'next-auth';
//import { redirect } from 'next/navigation';
import "./globals.css";


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
          {children}
      </body>
    </html>
  );
}
