import { useState } from 'react'
import { Header } from './components/Header'
import { StatsCards } from './components/StatsCards'
import { FilterBar } from './components/FilterBar'
import { NewsList } from './components/NewsList'
import { SourceModal } from './components/SourceModal'
import { MdToWechat } from './components/MdToWechat'
import { useTheme } from './hooks/useTheme'
import { useNewsData } from './hooks/useNewsData'
import { Moon, Sun } from 'lucide-react'

function App() {
  const { theme, toggleTheme } = useTheme()
  const [showSourceModal, setShowSourceModal] = useState(false)
  const [view, setView] = useState<'news' | 'md'>('news')

  const {
    data,
    loading,
    error,
    filteredItems,
    siteStats,
    sourceStats,
    searchQuery,
    setSearchQuery,
    selectedSite,
    setSelectedSite,
    selectedSource,
    setSelectedSource,
    loadMore,
    hasMore,
    refresh,
    timeRange,
    setTimeRange,
  } = useNewsData()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {view === 'news' ? (
        <Header
          theme={theme}
          toggleTheme={toggleTheme}
          view={view}
          onViewChange={setView}
          onRefresh={refresh}
          loading={loading}
          generatedAt={data?.generated_at}
          windowHours={data?.window_hours}
          onShowSources={() => setShowSourceModal(true)}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
      ) : (
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">公众号排版工具</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">基于 md-main 转换链路</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-0.5">
                <button
                  onClick={() => setView('news')}
                  className="px-2.5 py-0.5 text-xs font-medium rounded-full transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  资讯
                </button>
                <button
                  onClick={() => setView('md')}
                  className="px-2.5 py-0.5 text-xs font-medium rounded-full transition-all bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-sm"
                >
                  公众号
                </button>
              </div>
              <button
                onClick={toggleTheme}
                className="btn btn-ghost p-2 rounded-lg"
                title={theme === 'light' ? '切换深色模式' : '切换浅色模式'}
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </header>
      )}
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {view === 'news' ? (
          <>
            <StatsCards
              totalItems={data?.total_items || 0}
              sourceCount={data?.source_count || 0}
              windowHours={data?.window_hours || 24}
              siteStats={siteStats}
              onShowSources={() => setShowSourceModal(true)}
            />

            <FilterBar
              siteStats={siteStats}
              sourceStats={sourceStats}
              selectedSite={selectedSite}
              onSiteChange={setSelectedSite}
              selectedSource={selectedSource}
              onSourceChange={setSelectedSource}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            <NewsList
              items={filteredItems}
              loading={loading}
              error={error}
              hasMore={hasMore}
              onLoadMore={loadMore}
            />
          </>
        ) : (
          <MdToWechat />
        )}
      </main>
      
      <footer className="border-t border-slate-200 dark:border-slate-700 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            AI Intel Studio · 数据来源于多个 AI 资讯平台
          </p>
        </div>
      </footer>

      <SourceModal
        isOpen={view === 'news' && showSourceModal}
        onClose={() => setShowSourceModal(false)}
        siteStats={siteStats}
        sourceCount={data?.source_count || 0}
        windowHours={data?.window_hours || 24}
      />
    </div>
  )
}

export default App
