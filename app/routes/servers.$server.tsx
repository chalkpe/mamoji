import { ActionFunctionArgs, json, LoaderFunctionArgs } from '@remix-run/node'
import { Form, isRouteErrorResponse, useLoaderData, useRouteError, useNavigation } from '@remix-run/react'
import { AlertCircle, Check, ExternalLink, Tag, Text, User } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useRemixForm, getValidatedFormData } from 'remix-hook-form'
import { useFieldArray } from 'react-hook-form'
import { AppEmoji } from '~/components/app-emoji'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, Form as UiForm } from '~/components/ui/form'
import { prisma } from '~/db.server'
import { nullsFirst, nullsLast } from '~/lib/utils'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '~/components/ui/input'
import { Checkbox } from '~/components/ui/checkbox'
import { upsertEmojis, upsertUserByHandle } from '~/lib/api'

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const server = params.server
  if (!server) throw json('Parameter not found', { status: 400 })
  return json({ server, emojis: await upsertEmojis(server) })
}

const formSchema = z.object({
  emojis: z.array(z.object({ serverUrl: z.string(), shortcode: z.string() })).nonempty({ message: '이모지를 선택하세요.' }),
  author: z.union([z.literal(''), z.string().email({ message: '올바른 핸들을 입력하세요.' })]),
  copyable: z.boolean(),
  tags: z.string().optional(),
  sensitive: z.boolean(),
})

const resolver = zodResolver(formSchema)

export default function Server() {
  const navigation = useNavigation()
  const { server, emojis } = useLoaderData<typeof loader>()

  const [search, setSearch] = useState('')
  const [searchBy, setSearchBy] = useState<'shortcode' | 'tag' | 'author'>()
  const [groupBy, setGroupBy] = useState<'category' | 'authorHandle'>('category')

  const searchEmojis = useMemo(
    () =>
      emojis.filter((emoji) => {
        if (search === '') return true
        if (searchBy === 'shortcode') return emoji.shortcode.includes(search)
        if (searchBy === 'tag') return emoji.tags.some((tag) => tag.includes(search))
        if (searchBy === 'author') return emoji.authorHandle?.includes(search)
        return true
      }),
    [emojis, search, searchBy],
  )

  const emojiEntries: [string | null, typeof emojis][] = useMemo(
    () =>
      [...new Set(searchEmojis.map((emoji) => (groupBy === 'category' ? emoji.category : emoji.authorHandle)))]
        .sort((groupBy === 'category' ? nullsFirst : nullsLast)((a, b) => a.localeCompare(b)))
        .map((groupId) => [
          groupId,
          searchEmojis
            .filter((emoji) => (groupBy === 'category' ? emoji.category === groupId : emoji.authorHandle === groupId))
            .sort((a, b) => a.shortcode.localeCompare(b.shortcode)),
        ]),
    [searchEmojis, groupBy],
  )

  const form = useRemixForm<z.infer<typeof formSchema>>({
    resolver,
    defaultValues: { emojis: [], author: '', copyable: true, tags: '', sensitive: false },
  })

  const { fields, append, replace } = useFieldArray({ control: form.control, name: 'emojis' })

  useEffect(() => {
    const mine = fields.filter((f) => f.serverUrl === server)
    if (fields.length !== mine.length) replace(mine)
  }, [fields, replace, server])

  return (
    <>
      <section className="flex-auto overflow-y-scroll flex flex-col gap-5 lg:pb-5">
        {emojiEntries.map(([groupId, list]) => (
          <Card key={groupId ?? 'undefined'}>
            <CardHeader>
              <CardTitle className="flex flex-row gap-2 items-center">
                {groupBy === 'authorHandle' && groupId && (
                  <img
                    src={list[0].author?.avatarUrl}
                    alt={list[0].author?.name}
                    title={list[0].author?.name}
                    className="size-5 rounded-md"
                  />
                )}
                <span>{groupId ?? (groupBy === 'category' ? '커스텀' : '제작자 정보 없음')}</span>

                {groupBy === 'authorHandle' && groupId && (
                  <a
                    title="제작자 페이지로 이동"
                    href={`https://${groupId.split('@')[1]}/@${groupId.split('@')[0]}`}
                    target="_blank"
                    rel="noreferrer"
                    className=""
                  >
                    <ExternalLink />
                  </a>
                )}
              </CardTitle>
              <CardDescription>{list.length.toLocaleString()}개의 이모지</CardDescription>
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
        {search && searchBy && emojiEntries.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>검색 결과 없음</CardTitle>
              <CardDescription>
                키워드: {search}, 조건: {searchBy}
              </CardDescription>
            </CardHeader>
            <CardContent>입력한 키워드에 해당하는 검색 결과가 없습니다.</CardContent>
          </Card>
        )}
      </section>
      <section className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle>{server}</CardTitle>
            <CardDescription>{emojis.length.toLocaleString()}개의 이모지</CardDescription>
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
                        <FormDescription>1차 창작 이모지의 경우 해제하세요.</FormDescription>
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

  const { emojis, author, copyable, sensitive, tags } = data

  try {
    if (author !== '') await upsertUserByHandle(author)
  } catch (error) {
    return json({
      errors: {
        author: { message: '사용자 정보를 확인할 수 없습니다.', ref: { name: 'author' }, type: 'server' },
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
          tags: tags ? [...new Set(tags.split(',').map((tag) => tag.trim()))] : undefined,
        },
      }),
    ),
  )

  return json({ errors: null })
}

export const handle = {
  breadcrumb: '서버 관리',
}
