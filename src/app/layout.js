import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";

export const metadata = {
  title: "NSNexus — Cursos & Consultoria de Impacto Corporativo",
  description: "Aprenda Power BI, Power Apps, SharePoint, Sistemas e IA sob a ótica de negócios. Domine as ferramentas que aceleram decisões e automatizam rotinas.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Material Symbols Outlined */}
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />
        <link rel="icon" type="image/png" href="/images/logo.png" />
      </head>
      <body>
        <AuthProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
