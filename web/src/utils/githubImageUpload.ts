export interface GithubImageConfig {
  repo: string
  branch?: string
  accessToken: string
}

function parseRepo(repoInput: string): { owner: string; repo: string } {
  const cleaned = repoInput
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/^github\.com\//i, '')
    .replace(/\/+$/, '')
  const [owner, repo] = cleaned.split('/')
  if (!owner || !repo) {
    throw new Error('GitHub 仓库格式错误，请使用 owner/repo 或 github.com/owner/repo')
  }
  return { owner, repo }
}

function getDir(): string {
  const date = new Date()
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}/${m}/${d}`
}

function getExt(file: File): string {
  const byName = file.name.split('.').pop()?.trim()
  if (byName) return byName
  const byType = file.type.split('/').pop()?.trim()
  return byType || 'png'
}

function getDateFilename(file: File): string {
  const ext = getExt(file)
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
  return `${Date.now()}-${random}.${ext}`
}

function toBase64WithoutHeader(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const idx = result.indexOf(',')
      if (idx === -1) {
        reject(new Error('图片 Base64 编码失败'))
        return
      }
      resolve(result.slice(idx + 1))
    }
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

export async function uploadImageToGithub(file: File, config: GithubImageConfig): Promise<string> {
  const { owner, repo } = parseRepo(config.repo)
  const branch = (config.branch || '').trim() || 'master'
  const token = (config.accessToken || '').trim()
  if (!token) {
    throw new Error('请先填写 GitHub Token')
  }

  const dir = getDir()
  const filename = getDateFilename(file)
  const content = await toBase64WithoutHeader(file)

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${dir}/${filename}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github+json',
    },
    body: JSON.stringify({
      message: `Upload by ai-news-web`,
      content,
      branch,
    }),
  })

  const payload = await res.json().catch(() => ({})) as {
    message?: string
    content?: { download_url?: string }
  }

  if (!res.ok) {
    throw new Error(payload.message || `上传失败（HTTP ${res.status}）`)
  }

  const downloadUrl = payload.content?.download_url
  if (!downloadUrl) {
    throw new Error('上传成功但未返回图片地址')
  }
  return downloadUrl
}
