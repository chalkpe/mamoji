import { defer, json, LoaderFunctionArgs } from '@remix-run/node'
import { Await, useLoaderData } from '@remix-run/react'
import { Download } from 'lucide-react'
import { Suspense, useCallback, useState } from 'react'
import { AppEmoji } from '~/components/app-emoji'
import { AppEmojiLibrary } from '~/components/app-emoji-library'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '~/components/ui/card'
import { Emoji, findEmojis, PartialEmoji } from '~/lib/api'
import JSZip from 'jszip'

export async function loader({ params }: LoaderFunctionArgs) {
  const server = params.server
  if (!server) throw json('Parameter not found', { status: 400 })
  return defer({ server, emojis: findEmojis(server) })
}

export default function Explore() {
  const { server, emojis } = useLoaderData<typeof loader>()
  const [selectedEmojis, setSelectedEmojis] = useState<PartialEmoji[]>([])
  const [isDownloading, setIsDownloading] = useState(false)

  const downloadEmojis = useCallback(async (emojis: Emoji[]) => {
    if (isDownloading) return
    setIsDownloading(true)
    const zip = new JSZip()

    for (const emoji of emojis) {
      const res = await fetch(emoji.url)
      const type = res.headers.get('Content-Type')
      zip.file(`${emoji.shortcode}.${type?.split('/')[1]}`, res.blob())
    }

    const content = await zip.generateAsync({ type: 'blob' })

    const a = document.createElement('a')
    a.href = URL.createObjectURL(content)
    a.download = `mamoji-${server}.zip`
    a.click()

    setIsDownloading(false)
  }, [isDownloading, server])

  return (
    <section className="flex flex-row gap-5">
      <Suspense>
        <Await resolve={emojis}>
          {(emojis) => (
            <AppEmojiLibrary
              emojis={emojis}
              search=""
              searchBy="shortcode"
              groupBy="category"
              selectedEmojis={selectedEmojis}
              onSelectEmojis={(es) => setSelectedEmojis((se) => [...se, ...es.filter((emoji) => !se.find((p) => p.shortcode === emoji.shortcode))])}
              onUnselectEmojis={(es) => setSelectedEmojis((se) => se.filter((p) => !es.find((emoji) => emoji.shortcode === p.shortcode)))}
              className="pb-5"
            />
          )}
        </Await>
      </Suspense>
      <Card className="w-[23rem] flex-shrink-0 pb-5">
        <CardHeader>
          <CardTitle>선택된 이모지</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense>
            <Await resolve={emojis}>
              {(emojis) => (
                <div className="max-h-[12rem] overflow-y-scroll flex flex-row flex-wrap gap-2">
                  {selectedEmojis.flatMap(({ shortcode }) => {
                    const emoji = emojis.find((e) => e.shortcode === shortcode)
                    if (!emoji) return []
                    return [
                      <AppEmoji
                        key={shortcode}
                        emoji={emoji}
                        onClick={() => setSelectedEmojis((prev) => prev.filter((e) => e.shortcode !== shortcode))}
                      />,
                    ]
                  })}
                </div>
              )}
            </Await>
          </Suspense>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Suspense>
            <Await resolve={emojis}>
              {(emojis) => (
                <Button className="w-full" disabled={!selectedEmojis.length || isDownloading} onClick={() => downloadEmojis(selectedEmojis.flatMap(({ shortcode }) => {
                  const emoji = emojis.find((e) => e.shortcode === shortcode)
                  return emoji?.copyable ? [emoji] : []
                }))}>
                  <Download />
                  다운로드
                </Button>
              )}
            </Await>
          </Suspense>
        </CardFooter>
      </Card>
    </section>
  )
}

export const handle = {
  breadcrumb: '서버 열람',
}
