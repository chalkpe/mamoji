import { FC, memo } from 'react'
import { Emoji } from '@prisma/client'
import { cn } from '~/lib/utils'
import { HoverCard, HoverCardContent, HoverCardTrigger } from './ui/hover-card'
import { Book, Copy, CopyX, Tag, TriangleAlert, User } from 'lucide-react'

interface AppEmojiProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  emoji: Emoji
}

const InternalAppEmoji: FC<AppEmojiProps> = ({ emoji, className, ...props }) => {
  return (
    <HoverCard>
      <HoverCardTrigger>
        <button
          className={cn(
            'w-14 h-14',
            'relative',
            'cursor-pointer',
            'before:absolute',
            'before:top-0',
            'before:left-0',
            'before:z-0',
            'before:w-full',
            'before:h-full',
            emoji.copyable ? 'before:bg-green-500' : 'before:bg-red-500',
            'before:opacity-50',
            "before:content-['']",
            'before:rounded-full',
            className,
          )}
          {...props}
        >
          <img
            src={emoji.url}
            alt={emoji.shortcode}
            className={cn('absolute', 'top-2', 'left-2', 'z-10', 'w-10', 'h-10', 'object-contain')}
          />
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-80">
        <div className="flex flex-col gap-2">
          <h4 className="text-lg font-semibold">:{emoji.shortcode}:</h4>
          <div className="flex items-center">
            <Book className="mr-2 h-4 w-4 opacity-70" />{' '}
            <span className="text-sm">{emoji.category ?? <span className="text-muted-foreground">커스텀</span>}</span>
          </div>
          <div className="flex items-center">
            <Tag className="mr-2 h-4 w-4 opacity-70" />{' '}
            <span className="text-sm">
              {emoji.tags.length > 0 ? emoji.tags.join(', ') : <span className="text-muted-foreground">태그 없음</span>}
            </span>
          </div>
          {emoji.sensitive && (
            <div className="flex items-center">
              <TriangleAlert className="mr-2 h-4 w-4 opacity-70" />{' '}
              <span className="text-sm text-red-500">열람 주의 이모지로 지정됨</span>
            </div>
          )}
          <div className="flex items-center">
            <User className="mr-2 h-4 w-4 opacity-70" />{' '}
            <span className="text-sm">{emoji.authorHandle ?? <span className="text-muted-foreground">제작자 정보 없음</span>}</span>
          </div>
          <div className="flex items-center">
            {emoji.copyable ? <Copy className="mr-2 h-4 w-4 opacity-70" /> : <CopyX className="mr-2 h-4 w-4 opacity-70" />}{' '}
            <span className="text-sm text-muted-foreground">
              타 서버로의 복사 {emoji.copyable ? <span className="text-green-500">허용</span> : <span className="text-red-500">거부</span>}
            </span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

export const AppEmoji = memo(InternalAppEmoji)