import { FC } from 'react'
import { Emoji } from '@prisma/client'
import { cn } from '~/lib/utils'

interface AppEmojiProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  emoji: Emoji
}

export const AppEmoji: FC<AppEmojiProps> = ({ emoji, className, ...props }) => {
  return (
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
        title={`:${emoji.shortcode}:`}
        className={cn('absolute', 'top-2', 'left-2', 'z-10', 'w-10', 'h-10', 'object-contain')}
      />
    </button>
  )
}
