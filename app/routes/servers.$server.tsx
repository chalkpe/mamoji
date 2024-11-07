import { json, LoaderFunctionArgs } from '@remix-run/node'
import { isRouteErrorResponse, useLoaderData, useRouteError } from '@remix-run/react'
import { useSetAtom } from 'jotai'
import { useEffect, useMemo, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '~/components/ui/drawer'
import { prisma } from '~/db.server'
import { getEmoji, isMastodon } from '~/lib/mastodon'
import { cn } from '~/lib/utils'
import { serversAtom } from '~/store/servers'

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const server = params.server
  if (!server) throw json('Parameter not found', { status: 400 })

  const { error, name } = await isMastodon(server)
  if (error || !name) throw json(error, { status: 400 })

  await prisma.server.upsert({
    where: { url: server },
    create: { url: server, name },
    update: { name },
  })

  const res = await getEmoji(server)
  const emojis = await Promise.all(
    res.map(({ shortcode, url, category }) =>
      prisma.emoji.upsert({
        where: { serverUrl_shortcode: { serverUrl: server, shortcode } },
        create: { server: { connect: { url: server } }, shortcode, url, category },
        update: { url, category },
      }),
    ),
  )

  return json({ server, emojis })
}

export default function Server() {
  const { server, emojis } = useLoaderData<typeof loader>()
  const categories = useMemo(
    () =>
      [...new Set(emojis.map((emoji) => emoji.category))].sort((a, b) => {
        if (a === null) return -1
        if (b === null) return 1
        return a.localeCompare(b)
      }),
    [emojis],
  )

  const setServers = useSetAtom(serversAtom)
  useEffect(() => setServers((prev) => [...new Set([server, ...prev])].sort((a, b) => a.localeCompare(b))), [server, setServers])

  const [selectedEmoji, setSelectedEmoji] = useState<(typeof emojis)[number]>()

  return (
    <>
      <section className="flex flex-col gap-5">
        {categories.map((category) => {
          const categoryEmojis = emojis
            .filter((emoji) => emoji.category === category)
            .sort((a, b) => a.shortcode.localeCompare(b.shortcode))
          return (
            <Card key={category ?? 'undefined'}>
              <CardHeader>
                <CardTitle>{category ?? '커스텀'}</CardTitle>
                <CardDescription>{categoryEmojis.length}개의 이모지</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap">
                {categoryEmojis.map((emoji) => (
                  <button
                    key={emoji.shortcode}
                    onClick={() => setSelectedEmoji(emoji)}
                    className={cn(
                      'w-14 h-14',
                      'relative',
                      'cursor-pointer',
                      'hover:before:absolute',
                      'hover:before:top-0',
                      'hover:before:left-0',
                      'hover:before:z-0',
                      'hover:before:w-full',
                      'hover:before:h-full',
                      'hover:before:bg-black',
                      'hover:before:opacity-50',
                      "hover:before:content-['']",
                      'hover:before:rounded-full',
                    )}
                  >
                    <img
                      src={emoji.url}
                      alt={emoji.shortcode}
                      className={cn('absolute', 'top-2', 'left-2', 'z-10', 'w-10', 'h-10', 'object-contain')}
                    />
                  </button>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </section>
      <Drawer open={selectedEmoji !== undefined} onOpenChange={(open) => !open && setSelectedEmoji(undefined)}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex flex-col gap-2">
              <img src={selectedEmoji?.url} alt={selectedEmoji?.shortcode} className={cn('w-36', 'h-36', 'object-contain')} />
              <span>:{selectedEmoji?.shortcode}:</span>
            </DrawerTitle>
            <DrawerDescription>카테고리: {selectedEmoji?.category ?? '커스텀'}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4" />
        </DrawerContent>
      </Drawer>
    </>
  )
}

export function ErrorBoundary() {
  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    return (
      <Alert>
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.data}</AlertDescription>
      </Alert>
    )
  } else {
    return <h1>Unknown Error</h1>
  }
}
