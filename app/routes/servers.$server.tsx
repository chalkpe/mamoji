import { ActionFunctionArgs, defer, json, LoaderFunctionArgs } from '@remix-run/node'
import { Form, isRouteErrorResponse, useLoaderData, useRouteError, useNavigation, Await } from '@remix-run/react'
import { AlertCircle, Tag, Text, User } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { useRemixForm, getValidatedFormData } from 'remix-hook-form'
import { useFieldArray } from 'react-hook-form'
import { AppEmoji } from '~/components/app-emoji'
import { AppEmojiLibrary } from '~/components/app-emoji-library'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, Form as UiForm } from '~/components/ui/form'
import { prisma } from '~/db.server'
import { getErrorCause } from '~/lib/utils'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '~/components/ui/input'
import { Checkbox } from '~/components/ui/checkbox'
import { upsertEmojis, upsertUserByHandle } from '~/lib/api'
import { Textarea } from '~/components/ui/textarea'

export async function loader({ params }: LoaderFunctionArgs) {
  const server = params.server
  if (!server) throw json('Parameter not found', { status: 400 })
  return defer({ server, emojis: upsertEmojis(server) })
}

const formSchema = z.object({
  emojis: z.array(z.object({ serverUrl: z.string(), shortcode: z.string() })).nonempty({ message: '이모지를 선택하세요.' }),
  author: z.union([z.literal(''), z.string().email({ message: '올바른 핸들을 입력하세요.' })]),
  copyable: z.boolean(),
  tags: z.string().optional(),
  sensitive: z.boolean(),
  notes: z.string().optional(),
})

const resolver = zodResolver(formSchema)

export default function Server() {
  const navigation = useNavigation()
  const { server, emojis } = useLoaderData<typeof loader>()

  const [search, setSearch] = useState('')
  const [searchBy, setSearchBy] = useState<'shortcode' | 'tag' | 'author'>()
  const [groupBy, setGroupBy] = useState<'category' | 'authorHandle'>('category')

  const form = useRemixForm<z.infer<typeof formSchema>>({
    resolver,
    defaultValues: { emojis: [], author: '', copyable: true, tags: '', sensitive: false, notes: '' },
  })

  const { fields, append, replace } = useFieldArray({ control: form.control, name: 'emojis' })

  useEffect(() => {
    const mine = fields.filter((f) => f.serverUrl === server)
    if (fields.length !== mine.length) replace(mine)
  }, [fields, replace, server])

  return (
    <>
      <Suspense fallback={<Alert>이모지 로딩 중...</Alert>}>
        <Await resolve={emojis}>
          {(emojis) => (
            <AppEmojiLibrary
              emojis={emojis}
              search={search}
              searchBy={searchBy}
              groupBy={groupBy}
              selectedEmojis={fields}
              className="lg:pb-5 flex-1"
              onSelectEmojis={(emojis) => append(emojis.filter((emoji) => !fields.find((f) => f.shortcode === emoji.shortcode)))}
              onUnselectEmojis={(emojis) => replace(fields.filter((f) => !emojis.find((emoji) => emoji.shortcode === f.shortcode)))}
            />
          )}
        </Await>
      </Suspense>

      <section className="flex flex-col gap-5 overflow-y-scroll">
        <Card>
          <CardHeader>
            <CardTitle>{server}</CardTitle>
            <CardDescription>
              <Suspense fallback="이모지 로딩 중...">
                <Await resolve={emojis}>{(emojis) => `${emojis.length.toLocaleString()}개의 이모지`}</Await>
              </Suspense>
            </CardDescription>
          </CardHeader>

          <CardFooter className="flex flex-row gap-2">
            <Button className="flex-1" variant={groupBy === 'category' ? 'default' : 'outline'} onClick={() => setGroupBy('category')}>
              카테고리별
            </Button>
            <Button
              className="flex-1"
              variant={groupBy === 'authorHandle' ? 'default' : 'outline'}
              onClick={() => setGroupBy('authorHandle')}
            >
              제작자별
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>검색하기</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="키워드를 입력하세요" />
            <nav className="flex flex-row gap-2 justify-end">
              <Button
                className="flex-1"
                variant={searchBy === 'shortcode' ? 'default' : 'outline'}
                onClick={() => {
                  if (searchBy === 'shortcode') {
                    setSearch('')
                    setSearchBy(undefined)
                  } else {
                    setSearchBy('shortcode')
                  }
                }}
              >
                <Text />
                이름
              </Button>
              <Button
                className="flex-1"
                variant={searchBy === 'tag' ? 'default' : 'outline'}
                onClick={() => {
                  if (searchBy === 'tag') {
                    setSearch('')
                    setSearchBy(undefined)
                  } else {
                    setSearchBy('tag')
                  }
                }}
              >
                <Tag />
                태그
              </Button>
              <Button
                className="flex-1"
                variant={searchBy === 'author' ? 'default' : 'outline'}
                onClick={() => {
                  if (searchBy === 'author') {
                    setSearch('')
                    setSearchBy(undefined)
                  } else {
                    setSearchBy('author')
                  }
                }}
              >
                <User />
                제작자
              </Button>
            </nav>
          </CardContent>
        </Card>

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
                          <Suspense>
                            <Await resolve={emojis}>
                              {(emojis) => (
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
                            </Await>
                          </Suspense>
                        )}
                      </FormControl>
                      <FormDescription>{fields.length}개의 이모지</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>태그</FormLabel>
                      <FormControl>
                        <Input placeholder="예) 텍스트, 블롭모지" {...field} />
                      </FormControl>
                      <FormDescription>이모지의 태그들을 콤마로 구분해서 입력하세요.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sensitive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>열람 주의 이모지</FormLabel>
                        <FormDescription>NSFW, 반짝이는 이모지 등에 설정하세요.</FormDescription>
                      </div>
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
                      <FormMessage className="whitespace-pre-wrap" />
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
                        <FormDescription>1차 창작 이모지의 경우 해제하세요.</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>메모</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormDescription>이모지 관련 추가 정보를 입력할 수 있습니다.</FormDescription>
                      <FormMessage />
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
      </section>
    </>
  )
}

export function ErrorBoundary() {
  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    return (
      <Alert>
        <AlertCircle />
        <AlertTitle>오류</AlertTitle>
        <AlertDescription className="whitespace-pre-wrap">{error.data}</AlertDescription>
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

  const { emojis, author, copyable, sensitive, tags, notes } = data

  try {
    if (author !== '') await upsertUserByHandle(author)
  } catch (error) {
    const cause = getErrorCause(error)
    return json({
      errors: {
        author: {
          type: 'server',
          ref: { name: 'author' },
          message: cause ?? '사용자 정보를 확인할 수 없습니다.',
        },
      },
    })
  }

  await Promise.all(
    emojis.map(({ serverUrl, shortcode }) =>
      prisma.emoji.update({
        where: { serverUrl_shortcode: { serverUrl, shortcode } },
        data: {
          copyable,
          authorHandle: author !== '' ? author : null,
          sensitive,
          tags: tags
            ? [
                ...new Set(
                  tags
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter((tag) => tag.length > 0),
                ),
              ]
            : undefined,
          notes,
        },
      }),
    ),
  )

  return json({ errors: null })
}

export const handle = {
  breadcrumb: '서버 관리',
}
