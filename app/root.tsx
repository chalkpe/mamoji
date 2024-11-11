import React from 'react'
import { Links, Meta, NavLink, Outlet, Scripts, ScrollRestoration, useMatches } from '@remix-run/react'
import type { LinksFunction } from '@remix-run/node'

import './tailwind.css'
import { SidebarProvider, SidebarTrigger } from './components/ui/sidebar'
import AppSidebar from './components/app-sidebar'
import { Separator } from './components/ui/separator'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from './components/ui/breadcrumb'

export const links: LinksFunction = () => [
  {
    rel: 'stylesheet',
    href: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css',
  },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const matches = useMatches() as { handle?: { breadcrumb: string } }[]

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
            <header className="p-5 border-b fixed w-full z-50 top-0 bg-background flex items-center gap-2">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  {matches
                    .filter((match) => match.handle?.breadcrumb)
                    .map((match, index, array) => {
                      const key = match.handle?.breadcrumb
                      const isLast = index === array.length - 1
                      return (
                        <React.Fragment key={key}>
                          <BreadcrumbItem className={isLast ? '' : 'hidden md:block'}>
                            <NavLink to="/">
                              {() => (isLast ? <BreadcrumbPage>{key}</BreadcrumbPage> : <BreadcrumbLink>{key}</BreadcrumbLink>)}
                            </NavLink>
                          </BreadcrumbItem>
                          {!isLast && <BreadcrumbSeparator className="hidden md:block" />}
                        </React.Fragment>
                      )
                    })}
                </BreadcrumbList>
              </Breadcrumb>
            </header>
            <div className="w-full h-screen max-h-screen p-5 lg:pb-0 flex flex-col lg:flex-row gap-5 pt-[calc(70px+1.25rem)]">
              {children}
            </div>
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

export const handle = {
  breadcrumb: '마모지',
}
