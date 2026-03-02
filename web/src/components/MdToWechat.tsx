import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildThemeCss,
  generatePureHTML,
  type HeadingLevel,
  type HeadingStyleType,
  processClipboardContent,
  renderMarkdown,
  type LegendMode,
  type ThemeName,
} from '../utils/mdToWechat'
import { uploadImageToGithub } from '../utils/githubImageUpload'

interface UploadedImageHistoryItem {
  url: string
  fileName: string
  uploadedAt: string
  repo: string
  branch: string
}

const UPLOAD_HISTORY_KEY = 'md_wechat_uploaded_images'
const UPLOAD_HISTORY_LIMIT = 50

const FONT_FAMILY_OPTIONS = [
  {
    label: '无衬线',
    value: '-apple-system-font,BlinkMacSystemFont, Helvetica Neue, PingFang SC, Hiragino Sans GB, Microsoft YaHei UI, Microsoft YaHei, Arial, sans-serif',
  },
  {
    label: '衬线',
    value: 'Optima-Regular, Optima, PingFangSC-light, PingFangTC-light, PingFang SC, Cambria, Cochin, Georgia, Times, Times New Roman, serif',
  },
  { label: '等宽', value: "Menlo, Monaco, 'Courier New', monospace" },
] as const

const FONT_SIZE_OPTIONS = ['14px', '15px', '16px', '17px', '18px'] as const

const COLOR_OPTIONS = [
  { label: '经典蓝', value: '#0F4C81' },
  { label: '翡翠绿', value: '#009874' },
  { label: '活力橘', value: '#FA5151' },
  { label: '柠檬黄', value: '#FECE00' },
  { label: '薰衣紫', value: '#92617E' },
  { label: '天空蓝', value: '#55C9EA' },
  { label: '玫瑰金', value: 'rgba(122, 30, 30, 1)' },
  { label: '橄榄绿', value: '#556B2F' },
  { label: '石墨黑', value: '#333333' },
] as const

const CODE_THEME_OPTIONS = [
  { label: 'github', value: 'https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/npm/highlightjs/11.11.1/styles/github.min.css' },
  { label: 'atom-one-dark', value: 'https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/npm/highlightjs/11.11.1/styles/atom-one-dark.min.css' },
  { label: 'vs2015', value: 'https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/npm/highlightjs/11.11.1/styles/vs2015.min.css' },
  { label: 'nnfx-dark', value: 'https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/npm/highlightjs/11.11.1/styles/nnfx-dark.min.css' },
  { label: 'tokyo-night-dark', value: 'https://cdn-doocs.oss-cn-shenzhen.aliyuncs.com/npm/highlightjs/11.11.1/styles/tokyo-night-dark.min.css' },
] as const

const LEGEND_OPTIONS: Array<{ label: string; value: LegendMode }> = [
  { label: 'title 优先', value: 'title-alt' },
  { label: 'alt 优先', value: 'alt-title' },
  { label: '只显示 title', value: 'title' },
  { label: '只显示 alt', value: 'alt' },
  { label: '不显示', value: 'none' },
]

const HEADING_LEVELS: HeadingLevel[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
const HEADING_STYLE_OPTIONS: Array<{ label: string; value: HeadingStyleType }> = [
  { label: '默认', value: 'default' },
  { label: '主题色文字', value: 'color-only' },
  { label: '下边框', value: 'border-bottom' },
  { label: '左边框', value: 'border-left' },
  { label: '自定义', value: 'custom' },
]

function colorToHex(value: string): string {
  const v = value.trim().toLowerCase()
  if (v.startsWith('#')) {
    if (v.length === 7) return v
    if (v.length === 4) {
      return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
    }
    return '#7a1e1e'
  }
  const match = v.match(/rgba?\(([^)]+)\)/)
  if (!match) return '#7a1e1e'
  const parts = match[1].split(',').map((s) => Number(s.trim()))
  if (parts.length < 3) return '#7a1e1e'
  const [r, g, b] = parts
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function normalizeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function writeClipboardItems(items: ClipboardItem[]): Promise<void> {
  if (!navigator.clipboard?.write) {
    throw new Error('Clipboard API not available.')
  }
  await delay(0)
  await navigator.clipboard.write(items)
}

function fallbackCopyUsingExecCommand(htmlContent: string): boolean {
  const selection = window.getSelection()
  if (!selection) return false

  const tempContainer = document.createElement('div')
  tempContainer.innerHTML = htmlContent
  tempContainer.style.position = 'fixed'
  tempContainer.style.left = '-9999px'
  tempContainer.style.top = '0'
  tempContainer.style.opacity = '0'
  tempContainer.style.pointerEvents = 'none'
  tempContainer.style.setProperty('background-color', '#ffffff', 'important')
  tempContainer.style.setProperty('color', '#000000', 'important')
  document.body.appendChild(tempContainer)

  const htmlElement = document.documentElement
  const wasDark = htmlElement.classList.contains('dark')

  let successful = false
  try {
    if (wasDark) {
      htmlElement.classList.remove('dark')
    }

    const range = document.createRange()
    range.selectNodeContents(tempContainer)
    selection.removeAllRanges()
    selection.addRange(range)
    successful = document.execCommand('copy')
  } catch {
    successful = false
  } finally {
    selection.removeAllRanges()
    tempContainer.remove()
    if (wasDark) {
      htmlElement.classList.add('dark')
    }
  }

  return successful
}

export function MdToWechat() {
  const [markdown, setMarkdown] = useState('')
  const [themeName, setThemeName] = useState<ThemeName>('default')
  const [fontFamily, setFontFamily] = useState<string>(FONT_FAMILY_OPTIONS[0].value)
  const [fontSize, setFontSize] = useState<string>('16px')
  const [primaryColor, setPrimaryColor] = useState('rgba(122, 30, 30, 1)')
  const [codeBlockTheme, setCodeBlockTheme] = useState<string>(CODE_THEME_OPTIONS[0].value)
  const [legend, setLegend] = useState<LegendMode>('alt')
  const [isMacCodeBlock, setIsMacCodeBlock] = useState(true)
  const [isUseJustify, setIsUseJustify] = useState(true)
  const [headingStyles, setHeadingStyles] = useState<Record<HeadingLevel, HeadingStyleType>>({
    h1: 'default',
    h2: 'default',
    h3: 'default',
    h4: 'default',
    h5: 'default',
    h6: 'default',
  })
  const [customCss, setCustomCss] = useState('')
  const [lineHeight, setLineHeight] = useState(1.9)
  const [status, setStatus] = useState('')
  const [copying, setCopying] = useState(false)
  const [showCustomCss, setShowCustomCss] = useState(false)
  const [githubRepo, setGithubRepo] = useState('')
  const [githubBranch, setGithubBranch] = useState('master')
  const [githubToken, setGithubToken] = useState('')
  const [imgUploading, setImgUploading] = useState(false)
  const [uploadHistory, setUploadHistory] = useState<UploadedImageHistoryItem[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const markdownInputRef = useRef<HTMLTextAreaElement | null>(null)

  const outputHtml = useMemo(() => renderMarkdown(markdown, { legend }), [markdown, legend])
  const themeCss = useMemo(
    () =>
      buildThemeCss({
        themeName,
        primaryColor,
        fontFamily,
        fontSize,
        lineHeight,
        isUseJustify,
        headingStyles,
        customCss,
      }),
    [themeName, primaryColor, fontFamily, fontSize, lineHeight, isUseJustify, headingStyles, customCss],
  )

  useEffect(() => {
    let mounted = true
    async function loadInitialMarkdown(): Promise<void> {
      try {
        const basePath = import.meta.env.BASE_URL || '/'
        const res = await fetch(`${basePath}data/ai-output-md/ai-analysis-24h.md`)
        if (!res.ok) return
        const text = await res.text()
        if (mounted && text.trim()) {
          setMarkdown(text)
        }
      } catch {
        // no-op
      }
    }
    loadInitialMarkdown()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('md_wechat_github_config')
      if (!raw) return
      const cfg = JSON.parse(raw) as { repo?: string; branch?: string; token?: string }
      if (cfg.repo) setGithubRepo(cfg.repo)
      if (cfg.branch) setGithubBranch(cfg.branch)
      if (cfg.token) setGithubToken(cfg.token)
    } catch {
      // ignore bad local config
    }
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(UPLOAD_HISTORY_KEY)
      if (!raw) return
      const items = JSON.parse(raw) as UploadedImageHistoryItem[]
      if (Array.isArray(items)) {
        setUploadHistory(items)
      }
    } catch {
      // ignore bad local data
    }
  }, [])

  useEffect(() => {
    const head = document.head
    let hljsLink = document.getElementById('hljs') as HTMLLinkElement | null
      if (!hljsLink) {
        hljsLink = document.createElement('link')
        hljsLink.id = 'hljs'
        hljsLink.rel = 'stylesheet'
        head.appendChild(hljsLink)
      }
      hljsLink.href = codeBlockTheme

      let mdTheme = document.getElementById('md-theme') as HTMLStyleElement | null
      if (!mdTheme) {
        mdTheme = document.createElement('style')
        mdTheme.id = 'md-theme'
        head.appendChild(mdTheme)
      }
      mdTheme.textContent = themeCss
  }, [themeCss, codeBlockTheme])

  useEffect(() => {
    if (!status) return
    const timer = window.setTimeout(() => setStatus(''), 2200)
    return () => window.clearTimeout(timer)
  }, [status])

  async function copyMarkdownSource(): Promise<void> {
    try {
      await navigator.clipboard.writeText(markdown)
      setStatus('已复制 Markdown 源码到剪贴板。')
    } catch (error) {
      setStatus(`复制失败：${normalizeErrorMessage(error)}`)
    }
  }

  async function copyWechatReady(): Promise<void> {
    const clipboardDiv = document.getElementById('output')
    if (!clipboardDiv) {
      setStatus('未找到复制输出区域，请刷新页面后重试。')
      return
    }

    setCopying(true)

    window.setTimeout(() => {
      void (async () => {
        try {
          await processClipboardContent(primaryColor)
        } catch (error) {
          setStatus(`处理 HTML 失败，请联系开发者。${normalizeErrorMessage(error)}`)
          clipboardDiv.innerHTML = outputHtml
          setCopying(false)
          return
        }

        clipboardDiv.focus()
        window.getSelection()?.removeAllRanges()
        const temp = clipboardDiv.innerHTML

        try {
          if (typeof ClipboardItem === 'undefined') {
            throw new TypeError('ClipboardItem is not supported in this browser.')
          }
          const plainText = clipboardDiv.textContent || ''
          const clipboardItem = new ClipboardItem({
            'text/html': new Blob([temp], { type: 'text/html' }),
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
          })
          await writeClipboardItems([clipboardItem])
        } catch (error) {
          const fallbackSucceeded = fallbackCopyUsingExecCommand(temp)
          if (!fallbackSucceeded) {
            clipboardDiv.innerHTML = outputHtml
            window.getSelection()?.removeAllRanges()
            setCopying(false)
            setStatus(`复制失败，请联系开发者。${normalizeErrorMessage(error)}`)
            return
          }
        }

        clipboardDiv.innerHTML = outputHtml
        setCopying(false)
        setStatus('已复制渲染后的内容到剪贴板，可直接到公众号后台粘贴。')
      })()
    }, 350)
  }

  async function copyPureHtml(): Promise<void> {
    try {
      const html = generatePureHTML(markdown)
      await navigator.clipboard.writeText(html)
      setStatus('已复制 HTML 源码，请进行下一步操作。')
    } catch (error) {
      setStatus(`复制失败：${normalizeErrorMessage(error)}`)
    }
  }

  function resetStyle(): void {
    setThemeName('default')
    setFontFamily(FONT_FAMILY_OPTIONS[0].value)
    setFontSize('16px')
    setPrimaryColor('rgba(122, 30, 30, 1)')
    setCodeBlockTheme(CODE_THEME_OPTIONS[0].value)
    setLegend('alt')
    setIsMacCodeBlock(true)
    setIsUseJustify(true)
    setHeadingStyles({
      h1: 'default',
      h2: 'default',
      h3: 'default',
      h4: 'default',
      h5: 'default',
      h6: 'default',
    })
    setLineHeight(1.9)
    setCustomCss('')
  }

  function saveGithubConfig(): void {
    try {
      localStorage.setItem(
        'md_wechat_github_config',
        JSON.stringify({
          repo: githubRepo.trim(),
          branch: githubBranch.trim() || 'master',
          token: githubToken.trim(),
        }),
      )
      setStatus('GitHub 图床配置已保存。')
    } catch (error) {
      setStatus(`保存失败：${normalizeErrorMessage(error)}`)
    }
  }

  function insertMarkdownAtCursor(insertText: string): void {
    const ta = markdownInputRef.current
    if (!ta) {
      setMarkdown((prev) => `${prev}${insertText}`)
      return
    }
    const start = ta.selectionStart ?? ta.value.length
    const end = ta.selectionEnd ?? ta.value.length
    const current = ta.value
    const next = `${current.slice(0, start)}${insertText}${current.slice(end)}`
    setMarkdown(next)
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + insertText.length
      ta.setSelectionRange(pos, pos)
    })
  }

  function persistUploadHistory(next: UploadedImageHistoryItem[]): void {
    setUploadHistory(next)
    localStorage.setItem(UPLOAD_HISTORY_KEY, JSON.stringify(next))
  }

  function appendUploadHistory(item: UploadedImageHistoryItem): void {
    const next = [item, ...uploadHistory.filter((h) => h.url !== item.url)].slice(0, UPLOAD_HISTORY_LIMIT)
    persistUploadHistory(next)
  }

  async function handleImageFile(file: File): Promise<void> {
    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('请选择图片文件')
      }
      if (!githubRepo.trim() || !githubToken.trim()) {
        throw new Error('请先填写并保存 GitHub 图床配置')
      }
      setImgUploading(true)
      const url = await uploadImageToGithub(file, {
        repo: githubRepo.trim(),
        branch: githubBranch.trim() || 'master',
        accessToken: githubToken.trim(),
      })
      insertMarkdownAtCursor(`\n![](${url})\n`)
      appendUploadHistory({
        url,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        repo: githubRepo.trim(),
        branch: githubBranch.trim() || 'master',
      })
      setStatus('图片上传成功，已插入 Markdown。')
    } catch (error) {
      setStatus(`上传失败：${normalizeErrorMessage(error)}`)
    } finally {
      setImgUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  function onSelectImage(): void {
    fileInputRef.current?.click()
  }

  function useHistoryImage(url: string): void {
    insertMarkdownAtCursor(`\n![](${url})\n`)
    setStatus('已从历史记录插入图片链接。')
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">MD 转公众号排版</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">复制渲染结果后可直接粘贴到公众号后台</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn btn-ghost text-sm py-1.5 px-3" onClick={copyMarkdownSource}>
              复制 Markdown
            </button>
            <button className="btn btn-ghost text-sm py-1.5 px-3" onClick={copyPureHtml}>
              复制 HTML
            </button>
            <button className="btn btn-primary text-sm py-1.5 px-3" onClick={copyWechatReady} disabled={copying}>
              {copying ? '复制中...' : '复制到微信公众号'}
            </button>
            <button className="btn btn-ghost text-sm py-1.5 px-3" onClick={resetStyle}>
              重置样式
            </button>
          </div>
        </div>
        {status && <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{status}</p>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="card p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <label className="text-xs text-slate-500 dark:text-slate-400">
              主题
              <select
                className="input mt-1 py-2"
                value={themeName}
                onChange={(e) => setThemeName(e.target.value as ThemeName)}
              >
                <option value="default">经典</option>
                <option value="grace">优雅</option>
                <option value="simple">简洁</option>
              </select>
            </label>
            <label className="text-xs text-slate-500 dark:text-slate-400">
              字体
              <select
                className="input mt-1 py-2"
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
              >
                {FONT_FAMILY_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-500 dark:text-slate-400">
              字号
              <select
                className="input mt-1 py-2"
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
              >
                {FONT_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-500 dark:text-slate-400">
              主色
              <input
                type="color"
                value={colorToHex(primaryColor)}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="mt-1 h-9 w-full rounded border border-slate-300 dark:border-slate-600"
              />
            </label>
            <label className="text-xs text-slate-500 dark:text-slate-400">
              代码块主题
              <select
                className="input mt-1 py-2"
                value={codeBlockTheme}
                onChange={(e) => setCodeBlockTheme(e.target.value)}
              >
                {CODE_THEME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-500 dark:text-slate-400">
              图注格式
              <select className="input mt-1 py-2" value={legend} onChange={(e) => setLegend(e.target.value as LegendMode)}>
                {LEGEND_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-500 dark:text-slate-400">
              字号 {fontSize}
              <input
                type="range"
                min={14}
                max={20}
                step={1}
                value={Number(fontSize.replace('px', ''))}
                onChange={(e) => setFontSize(`${Number(e.target.value)}px`)}
                className="mt-2 w-full"
              />
            </label>
            <label className="text-xs text-slate-500 dark:text-slate-400">
              行高 {lineHeight.toFixed(2)}
              <input
                type="range"
                min={1.6}
                max={2.2}
                step={0.05}
                value={lineHeight}
                onChange={(e) => setLineHeight(Number(e.target.value))}
                className="mt-2 w-full"
              />
            </label>
            <label className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={isMacCodeBlock}
                onChange={(e) => setIsMacCodeBlock(e.target.checked)}
                className="rounded"
              />
              Mac 代码块样式
            </label>
            <label className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={isUseJustify}
                onChange={(e) => setIsUseJustify(e.target.checked)}
                className="rounded"
              />
              段落两端对齐
            </label>
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">主题色预设</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`h-8 px-2 rounded border text-xs ${
                    colorToHex(primaryColor).toLowerCase() === colorToHex(opt.value).toLowerCase()
                      ? 'border-slate-900 dark:border-white'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                  style={{ backgroundColor: opt.value, color: '#fff' }}
                  onClick={() => setPrimaryColor(opt.value)}
                  title={opt.label}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">标题样式</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {HEADING_LEVELS.map((level) => (
                <label key={level} className="text-xs text-slate-500 dark:text-slate-400">
                  {level.toUpperCase()}
                  <select
                    className="input mt-1 py-2"
                    value={headingStyles[level]}
                    onChange={(e) =>
                      setHeadingStyles((prev) => ({
                        ...prev,
                        [level]: e.target.value as HeadingStyleType,
                      }))
                    }
                  >
                    {HEADING_STYLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div>
            <button className="btn btn-ghost text-sm py-1.5 px-3" onClick={() => setShowCustomCss((v) => !v)}>
              {showCustomCss ? '隐藏自定义 CSS' : '显示自定义 CSS'}
            </button>
            {showCustomCss && (
              <textarea
                value={customCss}
                onChange={(e) => setCustomCss(e.target.value)}
                className="input mt-2 min-h-[140px] font-mono text-xs leading-5"
                placeholder="在此输入附加样式，例如：#output h2 { letter-spacing: .05em; }"
              />
            )}
          </div>

          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">插入图片（GitHub 图床）</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                className="input py-2 text-sm"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder="owner/repo 或 github.com/owner/repo"
              />
              <input
                className="input py-2 text-sm"
                value={githubBranch}
                onChange={(e) => setGithubBranch(e.target.value)}
                placeholder="分支，默认 master"
              />
            </div>
            <input
              className="input py-2 text-sm"
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="GitHub Personal Access Token"
            />
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-ghost text-sm py-1.5 px-3" onClick={saveGithubConfig}>
                保存 GitHub 配置
              </button>
              <button className="btn btn-primary text-sm py-1.5 px-3" onClick={onSelectImage} disabled={imgUploading}>
                {imgUploading ? '上传中...' : '选择图片并插入'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    void handleImageFile(file)
                  }
                }}
              />
            </div>
            {uploadHistory.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">上传历史（最近 {uploadHistory.length} 条）</p>
                <div className="max-h-36 overflow-auto space-y-1">
                  {uploadHistory.map((item) => (
                    <button
                      key={`${item.url}-${item.uploadedAt}`}
                      className="w-full text-left text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                      onClick={() => useHistoryImage(item.url)}
                      title={item.url}
                    >
                      <span className="block truncate">{item.fileName}</span>
                      <span className="block text-slate-400 truncate">{item.url}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <textarea
            ref={markdownInputRef}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="input min-h-[70vh] font-mono text-sm leading-6"
            spellCheck={false}
            placeholder="在这里输入 Markdown..."
          />
        </div>

        <div className="card p-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-3">预览</h3>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white p-4 min-h-[70vh] overflow-auto">
            <section
              id="output"
              className={`w-full ${isMacCodeBlock ? 'mac-code-block' : ''}`}
              dangerouslySetInnerHTML={{ __html: outputHtml }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
