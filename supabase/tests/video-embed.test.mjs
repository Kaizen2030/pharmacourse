// Lesson video link handling: src/lib/videoEmbed.js (plain JS, tested here with node --test).
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseLessonVideo } from '../../src/lib/videoEmbed.js'

describe('parseLessonVideo', () => {
  it('builds privacy-friendly YouTube embeds from every common link shape', () => {
    for (const link of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10', 'https://youtu.be/dQw4w9WgXcQ', 'https://youtube.com/shorts/dQw4w9WgXcQ', 'http://m.youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ']) {
      const v = parseLessonVideo(link)
      assert.equal(v.kind, 'youtube', link)
      assert.match(v.src, /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/)
    }
    assert.match(parseLessonVideo('https://youtu.be/dQw4w9WgXcQ', { start: 95.7 }).src, /start=95/)
  })

  it('converts Vimeo page links to the player, keeping unlisted hashes', () => {
    assert.equal(parseLessonVideo('https://vimeo.com/76979871').src, 'https://player.vimeo.com/video/76979871?dnt=1')
    assert.equal(parseLessonVideo('https://vimeo.com/76979871/abc123def').src, 'https://player.vimeo.com/video/76979871?dnt=1&h=abc123def')
    assert.equal(parseLessonVideo('https://player.vimeo.com/video/76979871?h=abc123def', { start: 30 }).src, 'https://player.vimeo.com/video/76979871?dnt=1&h=abc123def#t=30s')
  })

  it('uses the Drive preview link', () => {
    assert.equal(parseLessonVideo('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing').src, 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/preview')
    assert.equal(parseLessonVideo('https://drive.google.com/open?id=1AbCdEfGhIjKlMnOp').kind, 'drive')
  })

  it('does not put look-alike hosts in a frame', () => {
    assert.equal(parseLessonVideo('https://evil.example/youtube/watch?v=dQw4w9WgXcQ').kind, 'file', 'the word youtube in a path is not YouTube')
    assert.equal(parseLessonVideo('https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ').kind, 'file')
    assert.equal(parseLessonVideo('https://www.youtube.com/watch?v=bad"id').kind, 'unsupported')
  })

  it('plays other https links as video files, as before', () => {
    assert.deepEqual(parseLessonVideo('https://abc.supabase.co/storage/v1/object/public/media/l1.mp4'), { kind: 'file', src: 'https://abc.supabase.co/storage/v1/object/public/media/l1.mp4' })
  })

  it('refuses unsafe or empty links', () => {
    for (const bad of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'ftp://x/y.mp4', '', null, 'not a url']) {
      assert.equal(parseLessonVideo(bad).kind, 'unsupported', String(bad))
    }
  })
})
