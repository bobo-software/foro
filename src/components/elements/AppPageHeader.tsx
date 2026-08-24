import React from 'react'
import { LuArrowLeft } from 'react-icons/lu';

interface AppPageHeaderProps {
  icon?: React.ReactNode;
  /** Unstyled leading content (e.g. a company logo). Takes precedence over `icon`. */
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  showButton?: boolean;
  buttonText?: string;
  buttonIcon?: React.ReactNode;
  onButtonClick?: () => void;
  buttonClassName?: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  backButtonText?: string;
}

const AppPageHeader: React.FC<AppPageHeaderProps> = ({
  icon,
  leading,
  title,
  subtitle,
  showButton = false,
  buttonText,
  buttonIcon,
  onButtonClick,
  buttonClassName = '',
  showBackButton = false,
  onBackClick,
  backButtonText = 'Back'
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-3 min-w-0">
        {showBackButton && (
          <>
            <button
              onClick={onBackClick}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors shrink-0"
            >
              <LuArrowLeft size={14} />
              {backButtonText}
            </button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />
          </>
        )}
        {leading ? (
          <div className="shrink-0">{leading}</div>
        ) : (
          icon && (
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-md shrink-0">
              {icon}
            </div>
          )
        )}
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {showButton && (
        <button
          onClick={onButtonClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors shrink-0 ${buttonClassName}`}
        >
          {buttonIcon}
          {buttonText}
        </button>
      )}
    </div>
  )
}

export default AppPageHeader
