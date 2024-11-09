import { Emoji } from '@prisma/client'
import { json, LoaderFunctionArgs } from '@remix-run/node'
import { Form, isRouteErrorResponse, useLoaderData, useRouteError } from '@remix-run/react'
import { useSetAtom } from 'jotai'
import { Check } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { AppEmoji } from '~/components/app-emoji'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, Form as UiForm } from '~/components/ui/form'
import { prisma } from '~/db.server'
import { getEmoji, isMastodon } from '~/lib/mastodon'
import { nullsFirst } from '~/lib/utils'
import { serversAtom } from '~/store/servers'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '~/components/ui/input'
import { Checkbox } from '~/components/ui/checkbox'

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
  const emojiEntries: [(typeof emojis)[number]['category'], typeof emojis][] = useMemo(
    () =>
      [...new Set(emojis.map((emoji) => emoji.category))]
        .sort(nullsFirst((a, b) => a.localeCompare(b)))
        .map((category) => [
          category,
          emojis.filter((emoji) => emoji.category === category).sort((a, b) => a.shortcode.localeCompare(b.shortcode)),
        ]),
    [emojis],
  )

  const setServers = useSetAtom(serversAtom)
  useEffect(() => setServers((prev) => [...new Set([server, ...prev])].sort((a, b) => a.localeCompare(b))), [server, setServers])

  const [selectedEmojis, setSelectedEmojis] = useState<Set<Emoji>>(new Set())
  useEffect(() => {
    if (server) setSelectedEmojis(new Set())
  }, [server])

  const formSchema = z.object({
    author: z.union([z.literal(''), z.string().email({ message: '올바른 핸들을 입력하세요.' })]),
    copyable: z.boolean(),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { author: '', copyable: true },
  })

  const onSubmit = useCallback((values: z.infer<typeof formSchema>) => {
    console.log(values)
  }, [])

  return (
    <>
      <section className="flex-auto overflow-scroll flex flex-col gap-5 lg:pb-5">
        {emojiEntries.map(([category, list]) => (
          <Card key={category ?? 'undefined'}>
            <CardHeader>
              <CardTitle>{category ?? '커스텀'}</CardTitle>
              <CardDescription>{list.length}개의 이모지</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap">
              {list.map((emoji) => (
                <AppEmoji key={emoji.shortcode} emoji={emoji} onClick={() => setSelectedEmojis(new Set(selectedEmojis.add(emoji)))} />
              ))}
            </CardContent>
            <CardFooter>
              {list.every((emoji) => selectedEmojis.has(emoji)) ? (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setSelectedEmojis(new Set([...selectedEmojis].filter((emoji) => !list.includes(emoji))))}
                >
                  <Check /> 전부 해제
                </Button>
              ) : (
                <Button className="w-full" onClick={() => setSelectedEmojis(new Set([...selectedEmojis, ...list]))}>
                  <Check /> 전부 선택
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </section>
      <Card className="w-[21rem] flex-shrink-0 lg:mb-5">
        <CardHeader>
          <CardTitle>이모지 편집</CardTitle>
          <CardDescription>{selectedEmojis.size}개의 이모지</CardDescription>
        </CardHeader>
        <UiForm {...form}>
          <Form
            name="form"
            onSubmit={form.handleSubmit(onSubmit)}
            onReset={() => {
              form.reset()
              setSelectedEmojis(new Set())
            }}
          >
            <CardContent className="flex flex-col gap-5">
              {selectedEmojis.size > 0 && (
                <div className="max-h-[12rem] overflow-scroll">
                  {[...selectedEmojis].map((emoji) => (
                    <AppEmoji
                      key={emoji.shortcode}
                      emoji={emoji}
                      onClick={() => {
                        selectedEmojis.delete(emoji)
                        setSelectedEmojis(new Set(selectedEmojis))
                      }}
                    />
                  ))}
                </div>
              )}
              <FormField
                control={form.control}
                name="author"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>제작자</FormLabel>
                    <FormControl>
                      <Input placeholder="예) chalk@chalk.moe" {...field} />
                    </FormControl>
                    <FormDescription>이모지 제작자의 핸들을 입력하세요.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="copyable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>타 서버로의 복사 허용</FormLabel>
                      <FormDescription>2차 창작 이모지의 경우 해제하세요.</FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" type="reset">
                취소
              </Button>
              <Button type="submit">저장</Button>
            </CardFooter>
          </Form>
        </UiForm>
      </Card>
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
