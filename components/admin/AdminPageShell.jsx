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
    <div className={cn('mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between', className)}>
      <div className="flex items-start gap-3">
        {Icon ? (
          <div className="rounded-xl bg-primary/10 p-2 dark:bg-primary/20">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        ) : null}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {description ? <p className="text-gray-600 dark:text-gray-400">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function AdminSurface({ children, className = '' }) {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800', className)}>
      {children}
    </div>
  )
}