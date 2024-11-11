import { ActionFunctionArgs, json, LoaderFunctionArgs } from '@remix-run/node'
import { Form, isRouteErrorResponse, useLoaderData, useRouteError, useNavigation } from '@remix-run/react'
import { useSetAtom } from 'jotai'
import { Check } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useRemixForm, getValidatedFormData } from 'remix-hook-form'
import { useFieldArray } from 'react-hook-form'
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

const formSchema = z.object({
  emojis: z.array(z.object({ serverUrl: z.string(), shortcode: z.string() })).nonempty({ message: '이모지를 선택하세요.' }),
  author: z.union([z.literal(''), z.string().email({ message: '올바른 핸들을 입력하세요.' })]),
  copyable: z.boolean(),
})

const resolver = zodResolver(formSchema)

export default function Server() {
  const navigation = useNavigation()
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

  const form = useRemixForm<z.infer<typeof formSchema>>({
    resolver,
    defaultValues: { emojis: [], author: '', copyable: true },
  })

  const { fields, append, replace } = useFieldArray({ control: form.control, name: 'emojis' })

  useEffect(() => {
    const mine = fields.filter((f) => f.serverUrl === server)
    if (fields.length !== mine.length) replace(mine)
  }, [fields, replace, server])

  const setServers = useSetAtom(serversAtom)
  useEffect(() => setServers((prev) => [...new Set([server, ...prev])].sort((a, b) => a.localeCompare(b))), [server, setServers])

  return (
    <>
      <section className="flex-auto overflow-y-scroll flex flex-col gap-5 lg:pb-5">
        {emojiEntries.map(([category, list]) => (
          <Card key={category ?? 'undefined'}>
            <CardHeader>
              <CardTitle>{category ?? '커스텀'}</CardTitle>
              <CardDescription>{list.length}개의 이모지</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {list.map((emoji) => (
                <AppEmoji
                  key={emoji.shortcode}
                  emoji={emoji}
                  onClick={() => !fields.find((f) => f.shortcode === emoji.shortcode) && append(emoji)}
                />
              ))}
            </CardContent>
            <CardFooter>
              {list.every((emoji) => fields.find((f) => f.shortcode === emoji.shortcode)) ? (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => replace(fields.filter((f) => !list.find((emoji) => f.shortcode === emoji.shortcode)))}
                >
                  <Check /> 전부 해제
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => append(list.filter((emoji) => !fields.find((f) => f.shortcode === emoji.shortcode)))}
                >
                  <Check /> 전부 선택
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </section>
      <Card className="w-[23rem] flex-shrink-0 lg:mb-5">
        <CardHeader>
          <CardTitle>이모지 편집</CardTitle>
          <CardDescription>이모지의 메타데이터를 편집합니다.</CardDescription>
        </CardHeader>
        <UiForm {...form}>
          <Form method="post" onSubmit={form.handleSubmit} onReset={() => form.reset()} reloadDocument>
            <CardContent className="flex flex-col gap-5">
              <FormField
                control={form.control}
                name="emojis"
                render={() => (
                  <FormItem>
                    <FormLabel>선택된 이모지</FormLabel>
                    <FormControl>
                      {fields.length > 0 && (
                        <div className="max-h-[12rem] overflow-y-scroll flex flex-row flex-wrap gap-2">
                          {fields.flatMap(({ shortcode }) => {
                            const emoji = emojis.find((e) => e.shortcode === shortcode)
                            if (!emoji) return []
                            return [
                              <AppEmoji
                                key={shortcode}
                                emoji={emoji}
                                onClick={() => replace(fields.filter((f) => f.shortcode !== shortcode))}
                              />,
                            ]
                          })}
                        </div>
                      )}
                    </FormControl>
                    <FormDescription>{fields.length}개의 이모지</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <Button type="submit" disabled={navigation.state !== 'idle'}>
                저장
              </Button>
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

export async function action({ request }: ActionFunctionArgs) {
  const { errors, data } = await getValidatedFormData<z.infer<typeof formSchema>>(request, resolver)

  if (errors) {
    return json({ errors })
  }

  const { emojis, author, copyable } = data

  if (author !== '') {
    // TODO: fetch user data, upsert user table
  }

  await Promise.all(
    emojis.map(({ serverUrl, shortcode }) =>
      author !== ''
        ? prisma.emoji.update({
            where: { serverUrl_shortcode: { serverUrl, shortcode } },
            data: { copyable, authorHandle: author },
          })
        : prisma.emoji.update({
            where: { serverUrl_shortcode: { serverUrl, shortcode } },
            data: { copyable },
          }),
    ),
  )

  return json({ errors: null })
}
