import '@haaremy/hmydesign/index.css';
import { Main } from '@haaremy/hmydesign';
//import { authOptions } from './api/auth/[...nextauth]/route';
//import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';


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
    <html lang="de">
      <body>
        <Main>
          {children}
        </Main>
      </body>
    </html>
  );
}
