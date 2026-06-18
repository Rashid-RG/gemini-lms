import React from 'react'
import { cn } from '@/lib/utils'

export function AdminPageShell({ children, className = '', size = '7xl' }) {
  const sizeClassName = size === 'full' ? 'max-w-[1600px]' : 'max-w-7xl'

  return (
    <div className={cn('mx-auto w-full', sizeClassName, className)}>
      {children}
    </div>
  )
}

export function AdminPageHeader({ title, description, icon: Icon, actions, className = '' }) {
  return (
    <div className={cn('mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between border-b border-gray-100 dark:border-gray-800/80 pb-6', className)}>
      <div className="flex items-center gap-4">
        {Icon ? (
          <div className="rounded-2xl bg-primary/10 p-3 dark:bg-primary/20 shadow-sm border border-primary/10 transition-transform hover:scale-105 duration-300">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        ) : null}
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{title}</h1>
          {description ? <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm font-medium">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  )
}

export function AdminSurface({ children, className = '' }) {
  return (
    <div className={cn('rounded-2xl border border-gray-100 bg-white/95 shadow-sm shadow-gray-100/50 dark:border-gray-800/60 dark:bg-gray-800/90 backdrop-blur-md transition-all duration-300 hover:shadow-md dark:hover:border-gray-700/60', className)}>
      {children}
    </div>
  )
}