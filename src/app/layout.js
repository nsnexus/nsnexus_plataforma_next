import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import AppLayout from "../components/AppLayout";

export const metadata = {
  metadataBase: new URL("https://nsnexus.com.br"),
  title: "NSNexus — Cursos & Consultoria de Impacto Corporativo",
  description: "Aprenda Power BI, Power Apps, SharePoint, Sistemas e IA sob a ótica de negócios. Domine as ferramentas que aceleram decisões e automatizam rotinas.",
  icons: {
    icon: "/images/logo.png",
    shortcut: "/images/logo.png",
    apple: "/images/logo.png"
  },
  openGraph: {
    title: "NSNexus — Cursos & Consultoria de Impacto Corporativo",
    description: "Aprenda Power BI, Power Apps, SharePoint, Sistemas e IA sob a ótica de negócios. Domine as ferramentas que aceleram decisões e automatizam rotinas.",
    url: "https://nsnexus.com.br",
    siteName: "NSNexus",
    images: [
      {
        url: "/images/logo.png",
        width: 512,
        height: 512,
        alt: "NSNexus Logo"
      }
    ],
    locale: "pt_BR",
    type: "website"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Material Symbols Outlined */}
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />
        <link rel="icon" type="image/png" href="/images/logo.png" />
        {/* Pre-carrega o SDK do Mercado Pago para o checkout ser instantâneo */}
        <script src="https://sdk.mercadopago.com/js/v2" async></script>
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
