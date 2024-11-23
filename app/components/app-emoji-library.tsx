import { FC, memo, useMemo } from 'react'
import { Check, ExternalLink } from 'lucide-react'
import { AppEmoji } from './app-emoji'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card'
import { cn, nullsFirst, nullsLast } from '~/lib/utils'
import type { findEmojis } from '~/lib/api'

const emptyGroupId = 'undefined'

type Emoji = Awaited<ReturnType<typeof findEmojis>>[number]
type PartialEmoji = Pick<Emoji, 'serverUrl' | 'shortcode'>

interface AppEmojiCardProps {
  groupBy: 'category' | 'authorHandle'
  groupId: string | null
  emojis: Emoji[]
  selectedEmojis: PartialEmoji[]
  onSelectEmojis: (emojis: PartialEmoji[]) => void
  onUnselectEmojis: (emojis: PartialEmoji[]) => void
}

const InternalAppEmojiCard: FC<AppEmojiCardProps> = ({ groupBy, groupId, emojis, selectedEmojis, onSelectEmojis, onUnselectEmojis }) => {
  return (
    <Card key={groupId ?? emptyGroupId}>
      <CardHeader>
        <CardTitle className="flex flex-row gap-2 items-center">
          {groupBy === 'authorHandle' && groupId && (
            <img
              src={emojis[0].author?.avatarUrl}
              alt={emojis[0].author?.name}
              title={emojis[0].author?.name}
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
        <CardDescription>{emojis.length.toLocaleString()}개의 이모지</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {emojis.map((emoji) => (
          <AppEmoji key={emoji.shortcode} emoji={emoji} onClick={() => onSelectEmojis([emoji])} />
        ))}
      </CardContent>
      <CardFooter>
        {emojis.every((emoji) => selectedEmojis.find((s) => s.shortcode === emoji.shortcode)) ? (
          <Button className="w-full" variant="outline" onClick={() => onUnselectEmojis(emojis)}>
            <Check /> 전부 해제
          </Button>
        ) : (
          <Button className="w-full" onClick={() => onSelectEmojis(emojis)}>
            <Check /> 전부 선택
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

const AppEmojiCard = memo(InternalAppEmojiCard)

interface AppEmojiLibraryProps extends React.HTMLAttributes<HTMLElement> {
  emojis: Emoji[]
  search: string
  searchBy: 'shortcode' | 'tag' | 'author' | undefined
  groupBy: 'category' | 'authorHandle'
  selectedEmojis: PartialEmoji[]
  onSelectEmojis: (emojis: PartialEmoji[]) => void
  onUnselectEmojis: (emojis: PartialEmoji[]) => void
}

export const AppEmojiLibrary: FC<AppEmojiLibraryProps> = ({
  emojis,
  search,
  searchBy,
  groupBy,
  selectedEmojis,
  onSelectEmojis,
  onUnselectEmojis,
  className,
  ...props
}) => {
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

  const emojiEntries: [string | null, Emoji[]][] = useMemo(
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

  return (
    <section className={cn('overflow-y-scroll flex flex-col gap-5', className)} {...props}>
      {emojiEntries.map(([groupId, list]) => (
        <AppEmojiCard
          key={groupId ?? emptyGroupId}
          groupBy={groupBy}
          groupId={groupId}
          emojis={list}
          selectedEmojis={selectedEmojis}
          onSelectEmojis={onSelectEmojis}
          onUnselectEmojis={onUnselectEmojis}
        />
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
  )
}
