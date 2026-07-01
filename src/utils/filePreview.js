const EXTENSION_MIME_TYPES = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
}

function extensionFromName(name = '') {
  const extension = name.split('.').pop()?.toLowerCase()

  return extension && extension !== name.toLowerCase() ? extension : ''
}

export function inferPreviewMimeType(file, blob) {
  const extensionMime = EXTENSION_MIME_TYPES[extensionFromName(file?.original_name)]
  const metadataMime = file?.mime_type || file?.mimeType
  const blobMime = blob?.type

  return [metadataMime, blobMime, extensionMime]
    .find((mime) => mime && mime !== 'application/octet-stream') ?? extensionMime ?? ''
}

export function isPreviewableMimeType(mimeType = '') {
  return mimeType.startsWith('image/') || mimeType === 'application/pdf' || mimeType.startsWith('text/')
}

export function createRestrictedPdfViewerUrl(url) {
  if (!url) return url

  const separator = url.includes('#') ? '&' : '#'

  return `${url}${separator}toolbar=0&navpanes=0&scrollbar=0&view=FitH`
}

export function createPreviewBlob(blob, mimeType) {
  if (!mimeType || blob.type === mimeType) {
    return blob
  }

  return new Blob([blob], { type: mimeType })
}
