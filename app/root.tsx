import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react'
import type { LinksFunction } from '@remix-run/node'

import './tailwind.css'
import { SidebarProvider, SidebarTrigger } from './components/ui/sidebar'
import AppSidebar from './components/app-sidebar'

export const links: LinksFunction = () => [
  {
    rel: 'stylesheet',
    href: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css',
  },
]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-screen">
        <SidebarProvider>
          <AppSidebar />
          <main className="w-full max-h-screen">
            <header className="p-5 border-b fixed w-full z-50 top-0 bg-background">
              <SidebarTrigger />
            </header>
            <div className="w-full h-screen max-h-screen p-5 lg:pb-0 flex flex-col lg:flex-row gap-5 pt-[calc(70px+1.25rem)]">{children}</div>
          </main>
        </SidebarProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}
