import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ChevronLeft, Heart } from "lucide-react"
import { supabase } from "../lib/supabaseClient"
import SEO from "../components/SEO"
import BlogEngagementStats from "../components/BlogEngagementStats"
import BlogContentRenderer from "../components/BlogContentRenderer"
import MarkdownContent from "../components/MarkdownContent"
import { useAuth } from "../context/AuthContext"
import pharmacourseHeroVisual from "../assets/pharmacourse-hero-visual.svg"
import pharmacyosDashboard from "../assets/pharmacyos-dashboard.svg"
import {
  getBlogVisitorKey,
  markBlogViewRecorded,
  shouldRecordBlogView,
} from "../lib/blogEngagement"
import {
  formatBlogDate,
  getBlogCategoryLabel,
  getBlogCoverFallback,
  getBlogExcerpt,
  getBlogSectionImageAlt,
  getPopulatedBlogSections,
} from "../lib/blogHelpers"
import "./Blog.css"

const DEFAULT_ENGAGEMENT_STATE = {
  viewCount: 0,
  likeCount: 0,
  viewerLiked: false,
  likePending: false,
}

const COURSE_FALLBACK_GRADIENTS = {
  clinical: "linear-gradient(135deg, #0f6e56, #1d9e75)",
  management: "linear-gradient(135deg, #185fa5, #378add)",
  compliance: "linear-gradient(135deg, #854f0b, #ba7517)",
}

const SITE_RECOMMENDATIONS = [
  {
    path: "/workshops",
    badge: "Workshop",
    title: "Upcoming pharmacy workshops",
    description: "Join focused live sessions and practical learning experiences designed for pharmacy professionals.",
    cta: "View workshops",
    image: pharmacourseHeroVisual,
  },
  {
    path: "/pharmacyos",
    badge: "Platform",
    title: "Explore PharmacyOS",
    description: "See how PharmacyOS supports pharmacy operations, inventory control, claims, and compliance workflows.",
    cta: "Explore PharmacyOS",
    image: pharmacyosDashboard,
  },
]

function normalizeEngagementPayload(payload, fallback = {}) {
  return {
    viewCount: Number(payload?.view_count ?? fallback.viewCount ?? 0) || 0,
    likeCount: Number(payload?.like_count ?? fallback.likeCount ?? 0) || 0,
    viewerLiked: Boolean(payload?.viewer_liked ?? fallback.viewerLiked ?? false),
  }
}

function truncateRecommendationCopy(value, maxLength = 120) {
  const normalizedValue = `${value || ""}`.replace(/\s+/g, " ").trim()
  if (normalizedValue.length <= maxLength) return normalizedValue
  return `${normalizedValue.slice(0, maxLength).trimEnd()}...`
}

function formatCoursePrice(course) {
  return course.is_free ? "Free" : `KES ${Number(course.price || 0).toLocaleString()}`
}

function getCourseFallbackBackground(category) {
  return COURSE_FALLBACK_GRADIENTS[`${category || ""}`.trim().toLowerCase()] || "linear-gradient(135deg, #0f6e56, #1a6bb5)"
}

function getPrimarySiteRecommendation(post) {
  const recommendationText = [
    post?.title,
    post?.excerpt,
    post?.content,
    post?.category,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  const operationsSignals = ["operations", "inventory", "claims", "compliance", "management", "business", "workflow"]
  const shouldShowPlatform = operationsSignals.some((signal) => recommendationText.includes(signal))

  return shouldShowPlatform ? SITE_RECOMMENDATIONS[1] : SITE_RECOMMENDATIONS[0]
}

function RelatedPostCard({ post }) {
  return (
    <Link to={`/blog/${post.slug}`} className="related-post-card">
      <span className="blog-category-badge">{getBlogCategoryLabel(post.category)}</span>
      <h3>{post.title}</h3>
      <p>{getBlogExcerpt(post)}</p>
      <span className="related-post-card-meta">{formatBlogDate(post.published_at || post.created_at)}</span>
    </Link>
  )
}

function RecommendationTile({
  to,
  image,
  fallbackLabel,
  fallbackStyle,
  badge,
  meta,
  title,
  description,
  cta,
}) {
  return (
    <Link to={to} className="blog-recommendation-card">
      {image ? (
        <img src={image} alt={title} className="blog-recommendation-card-image" />
      ) : (
        <div className="blog-recommendation-card-fallback" style={fallbackStyle}>
          <span>{fallbackLabel || badge || "Explore"}</span>
        </div>
      )}

      <div className="blog-recommendation-card-body">
        <div className="blog-recommendation-card-meta">
          {badge ? <span className="blog-category-badge">{badge}</span> : null}
          {meta ? <span>{meta}</span> : null}
        </div>
        <h3>{title}</h3>
        <p>{description}</p>
        <span className="blog-recommendation-card-cta">{cta}</span>
      </div>
    </Link>
  )
}

function BlogSectionImagePlayer({ images, postTitle, sectionTitle }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    setActiveIndex(0)
  }, [images])

  useEffect(() => {
    if (images.length <= 1 || isPaused) return

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % images.length)
    }, 3800)

    return () => window.clearInterval(intervalId)
  }, [images.length, isPaused])

  return (
    <div
      className="blog-image-player"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="blog-image-player-stage">
        {images.map((imageUrl, imageIndex) => (
          <figure
            key={`${imageUrl}-${imageIndex}`}
            className={`blog-image-player-slide${imageIndex === activeIndex ? " active" : ""}`}
            aria-hidden={imageIndex === activeIndex ? "false" : "true"}
          >
            <img
              src={imageUrl}
              alt={getBlogSectionImageAlt(postTitle, sectionTitle, imageIndex)}
              className="blog-content-section-image"
            />
          </figure>
        ))}
      </div>
    </div>
  )
}

function getCommentInitials(name) {
  const parts = `${name || ""}`.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  if (parts.length === 0) return "PC"
  return parts.map((part) => part[0].toUpperCase()).join("")
}

export default function BlogPost() {
  const { user, profile, loading: authLoading } = useAuth()
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [relatedPosts, setRelatedPosts] = useState([])
  const [relatedMoreLink, setRelatedMoreLink] = useState(null)
  const [recommendedCourses, setRecommendedCourses] = useState([])
  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentContent, setCommentContent] = useState("")
  const [commentSaving, setCommentSaving] = useState(false)
  const [commentError, setCommentError] = useState("")
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [engagement, setEngagement] = useState(DEFAULT_ENGAGEMENT_STATE)

  useEffect(() => {
    loadPost()
  }, [slug])

  useEffect(() => {
    if (!post?.slug) return

    let isActive = true

    async function syncEngagement() {
      const visitorKey = getBlogVisitorKey()
      const fallbackSnapshot = {
        viewCount: post.view_count,
        likeCount: post.like_count,
        viewerLiked: false,
      }

      const { data: engagementData, error: engagementError } = await supabase.rpc("get_blog_post_engagement", {
        post_slug: post.slug,
        visitor_key: visitorKey,
      })

      if (!engagementError && isActive && engagementData) {
        setEngagement((current) => ({
          ...current,
          ...normalizeEngagementPayload(engagementData, fallbackSnapshot),
        }))
      }

      if (!shouldRecordBlogView(post.slug)) return

      const { data: nextViewCount, error: viewError } = await supabase.rpc("record_blog_post_view", {
        post_slug: post.slug,
      })

      if (!viewError) {
        markBlogViewRecorded(post.slug)

        if (isActive) {
          setEngagement((current) => ({
            ...current,
            viewCount: Number(nextViewCount) || current.viewCount,
          }))
        }
      }
    }

    syncEngagement()

    return () => {
      isActive = false
    }
  }, [post?.slug, post?.like_count, post?.view_count])

  useEffect(() => {
    if (!post?.id) {
      setComments([])
      setCommentsLoading(false)
      return
    }

    void loadComments(post.id)
  }, [post?.id])

  async function loadPost() {
    setLoading(true)
    setNotFound(false)
    setEngagement(DEFAULT_ENGAGEMENT_STATE)

    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle()

    if (error || !data) {
      console.error("Failed to load blog post:", error)
      setPost(null)
      setRelatedPosts([])
      setRelatedMoreLink(null)
      setRecommendedCourses([])
      setNotFound(true)
      setLoading(false)
      return
    }

    setPost(data)
    setEngagement({
      viewCount: Number(data.view_count) || 0,
      likeCount: Number(data.like_count) || 0,
      viewerLiked: false,
      likePending: false,
    })

    const buildRelatedQuery = () => supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, content, cover_image_url, category, published_at, created_at")
      .eq("is_published", true)
      .neq("slug", slug)
      .order("published_at", { ascending: false })
      .limit(4)

    let relatedQuery = buildRelatedQuery()

    if (data.category) {
      relatedQuery = relatedQuery.eq("category", data.category)
    }

    const [relatedResponse, coursesResponse] = await Promise.all([
      relatedQuery,
      supabase
        .from("courses")
        .select("id, slug, title, short_desc, description, category, is_free, price, image_url, created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(2),
    ])

    const relatedData = relatedResponse.data
    const courseData = coursesResponse.data || []

    if ((relatedData || []).length === 0 && data.category) {
      const { data: fallbackRelated } = await buildRelatedQuery()
      const nextFallbackPosts = fallbackRelated || []
      setRelatedPosts(nextFallbackPosts.slice(0, 3))
      setRelatedMoreLink(
        nextFallbackPosts.length > 3
          ? { href: "/blog", label: "More articles" }
          : null
      )
    } else {
      const nextRelatedPosts = relatedData || []
      setRelatedPosts(nextRelatedPosts.slice(0, 3))
      setRelatedMoreLink(
        nextRelatedPosts.length > 3
          ? {
              href: data.category ? `/blog?category=${encodeURIComponent(getBlogCategoryLabel(data.category))}` : "/blog",
              label: data.category ? `More in ${getBlogCategoryLabel(data.category)}` : "More articles",
            }
          : null
      )
    }

    setRecommendedCourses(courseData)
    setLoading(false)
  }

  async function loadComments(postId) {
    setCommentsLoading(true)
    setCommentError("")

    const { data, error } = await supabase
      .from("blog_comments")
      .select("id, commenter_name, content, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Failed to load blog comments:", error)
      setComments([])
    } else {
      setComments(data || [])
    }

    setCommentsLoading(false)
  }

  async function handleCommentSubmit(event) {
    event.preventDefault()

    if (!user || !post?.id || commentSaving) return

    const nextContent = commentContent.trim()
    if (!nextContent) {
      setCommentError("Write a comment before posting.")
      return
    }

    const displayName =
      `${profile?.full_name || ""}`.trim() ||
      `${user.user_metadata?.full_name || ""}`.trim() ||
      `${user.email || ""}`.split("@")[0] ||
      "PharmaCourse Member"

    setCommentSaving(true)
    setCommentError("")

    const { data, error } = await supabase
      .from("blog_comments")
      .insert({
        post_id: post.id,
        user_id: user.id,
        commenter_name: displayName,
        content: nextContent,
      })
      .select("id, commenter_name, content, created_at")
      .single()

    setCommentSaving(false)

    if (error) {
      console.error("Failed to post blog comment:", error)
      setCommentError(error.message || "We could not post your comment right now.")
      return
    }

    setComments((current) => [...current, data])
    setCommentContent("")
  }

  async function handleLikeToggle() {
    if (!post?.slug || engagement.likePending) return

    setEngagement((current) => ({ ...current, likePending: true }))

    const { data, error } = await supabase.rpc("toggle_blog_post_like", {
      post_slug: post.slug,
      visitor_key: getBlogVisitorKey(),
    })

    if (error) {
      console.error("Failed to toggle blog like:", error)
      setEngagement((current) => ({ ...current, likePending: false }))
      return
    }

    const nextSnapshot = normalizeEngagementPayload(data, engagement)

    setEngagement((current) => ({
      ...current,
      likeCount: nextSnapshot.likeCount,
      viewerLiked: nextSnapshot.viewerLiked,
      likePending: false,
    }))
  }

  if (loading) {
    return (
      <div className="page blog-page">
        <div className="container-wide" style={{ paddingTop: "4rem" }}>
          <div className="card blog-empty-state">
            <p>Loading article...</p>
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !post) {
    return (
      <div className="page blog-page">
        <div className="container-wide" style={{ paddingTop: "4rem" }}>
          <div className="card blog-empty-state">
            <p>That article could not be found.</p>
            <div style={{ marginTop: "1rem" }}>
              <Link to="/blog" className="btn btn-primary">Back to Blog</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const categoryLabel = getBlogCategoryLabel(post.category)
  const authorName = post.author_name || "PharmaCourse Team"
  const authorTitle = post.author_title || "Editorial Team"
  const contentSections = getPopulatedBlogSections(post.content_sections)
  const primarySiteRecommendation = getPrimarySiteRecommendation(post)
  const recommendationItems = [
    ...relatedPosts.slice(0, 1).map((relatedPost) => ({
      key: `post-${relatedPost.id}`,
      to: `/blog/${relatedPost.slug}`,
      image: relatedPost.cover_image_url || null,
      fallbackLabel: getBlogCategoryLabel(relatedPost.category),
      fallbackStyle: { background: getBlogCoverFallback(relatedPost.category) },
      badge: "Article",
      meta: formatBlogDate(relatedPost.published_at || relatedPost.created_at),
      title: relatedPost.title,
      description: truncateRecommendationCopy(getBlogExcerpt(relatedPost)),
      cta: "Read article",
    })),
    ...recommendedCourses.slice(0, 2).map((course) => ({
      key: `course-${course.id}`,
      to: `/courses/${course.slug || course.id}`,
      image: course.image_url || null,
      fallbackLabel: course.category || "Course",
      fallbackStyle: { background: getCourseFallbackBackground(course.category) },
      badge: "Course",
      meta: formatCoursePrice(course),
      title: course.title,
      description: truncateRecommendationCopy(course.short_desc || course.description, 125),
      cta: "View course",
    })),
    {
      key: primarySiteRecommendation.path,
      to: primarySiteRecommendation.path,
      image: primarySiteRecommendation.image,
      badge: primarySiteRecommendation.badge,
      title: primarySiteRecommendation.title,
      description: primarySiteRecommendation.description,
      cta: primarySiteRecommendation.cta,
    },
  ]

  return (
    <div className="page blog-page">
      <SEO
        title={post.title}
        description={post.excerpt || getBlogExcerpt(post)}
        path={`/blog/${post.slug}`}
        image={post.cover_image_url || undefined}
        type="article"
      />

      <div className="container-wide blog-post-layout">
        <article className="blog-post-main">
          <Link to="/blog" className="blog-back-link">
            <ChevronLeft size={16} />
            Back to Blog
          </Link>

          <div className="blog-post-meta">
            <span className="blog-category-badge">{categoryLabel}</span>
            <span>{formatBlogDate(post.published_at || post.created_at)}</span>
            <span>{authorName}</span>
          </div>

          <h1>{post.title}</h1>
          {post.excerpt ? <p className="blog-post-subtitle">{post.excerpt}</p> : null}

          <div className="blog-post-engagement-bar">
            <BlogEngagementStats
              viewCount={engagement.viewCount}
              likeCount={engagement.likeCount}
              viewerLiked={engagement.viewerLiked}
            />

            <button
              type="button"
              className={`blog-like-button${engagement.viewerLiked ? " liked" : ""}`}
              aria-pressed={engagement.viewerLiked}
              onClick={handleLikeToggle}
              disabled={engagement.likePending}
            >
              <Heart size={16} aria-hidden="true" />
              {engagement.likePending ? "Saving..." : engagement.viewerLiked ? "Liked" : "Like this article"}
            </button>
          </div>

          <div className="blog-post-cover-frame">
            {post.cover_image_url ? (
              <img src={post.cover_image_url} alt={post.title} className="blog-post-cover" />
            ) : (
              <div className="blog-post-cover-fallback" style={{ background: getBlogCoverFallback(post.category) }}>
                <span>{categoryLabel}</span>
              </div>
            )}
          </div>

          <BlogContentRenderer content={post.content} />

          {contentSections.length > 0 ? (
            <div className="blog-sections-render">
              {contentSections.map((section, index) => (
                <section key={`${post.id}-section-${index}`} className="blog-content-section">
                  <div className="blog-content-section-copy">
                    {section.title ? <h2>{section.title}</h2> : null}
                    {section.body ? <MarkdownContent content={section.body} className="markdown-content blog-section-markdown" /> : null}
                  </div>
                  {section.images.length > 0 ? (
                    <div className="blog-content-section-media">
                      <BlogSectionImagePlayer
                        images={section.images}
                        postTitle={post.title}
                        sectionTitle={section.title}
                      />
                    </div>
                  ) : null}
                </section>
              ))}
            </div>
          ) : null}

          <section className="blog-author-card">
            <div className="blog-author-avatar">{authorName.slice(0, 2).toUpperCase()}</div>
            <div>
              <h3>{authorName}</h3>
              <p>{authorTitle}</p>
              <p>
                {authorName} shares practical pharmacy and healthcare operations insights for professionals building
                stronger clinical and business systems.
              </p>
            </div>
          </section>

          <section className="blog-comments-card">
            <div className="blog-comments-head">
              <div>
                <h2>Comments</h2>
                <p>
                  Join the conversation on this article.
                </p>
              </div>
              <span className="blog-comments-count">
                {comments.length} {comments.length === 1 ? "comment" : "comments"}
              </span>
            </div>

            {user ? (
              <form className="blog-comment-form" onSubmit={handleCommentSubmit}>
                <textarea
                  value={commentContent}
                  onChange={(event) => setCommentContent(event.target.value)}
                  placeholder="Share your thoughts on this article..."
                  rows={5}
                  disabled={commentSaving}
                />
                <div className="blog-comment-form-row">
                  <p className="blog-comment-form-note">
                    Commenting as <strong>{profile?.full_name || user.email}</strong>
                  </p>
                  <button type="submit" className="btn btn-primary" disabled={commentSaving || authLoading}>
                    {commentSaving ? "Posting..." : "Post comment"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="blog-comment-login-prompt">
                <p>Sign in to leave a comment and join the discussion.</p>
                <div className="blog-comment-login-actions">
                  <Link to="/login" className="btn btn-primary">Sign in</Link>
                  <Link to="/register" className="btn btn-secondary">Create account</Link>
                </div>
              </div>
            )}

            {commentError ? <p className="blog-comment-error">{commentError}</p> : null}

            <div className="blog-comment-list">
              {commentsLoading ? (
                <p className="blog-comment-empty">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="blog-comment-empty">No comments yet. Be the first to respond.</p>
              ) : (
                comments.map((comment) => (
                  <article key={comment.id} className="blog-comment-item">
                    <div className="blog-comment-avatar">{getCommentInitials(comment.commenter_name)}</div>
                    <div className="blog-comment-body">
                      <div className="blog-comment-meta">
                        <strong>{comment.commenter_name}</strong>
                        <span>{formatBlogDate(comment.created_at)}</span>
                      </div>
                      <p>{comment.content}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </article>

        <aside className="blog-sidebar">
          <div className="blog-sidebar-card">
            <h2>Related posts</h2>
            {relatedPosts.length === 0 ? (
              <p className="blog-toolbar-summary">No related posts available yet.</p>
            ) : (
              <>
                <div className="related-post-list">
                  {relatedPosts.map((relatedPost) => (
                    <RelatedPostCard key={relatedPost.id} post={relatedPost} />
                  ))}
                </div>

                {relatedMoreLink ? (
                  <Link to={relatedMoreLink.href} className="related-posts-more-link">
                    {relatedMoreLink.label}
                  </Link>
                ) : null}
              </>
            )}
          </div>
        </aside>
      </div>

      <div className="container-wide">
        <section className="blog-recommendations-section">
          <div className="blog-recommendations-header">
            <span className="blog-filter-label">Continue Exploring</span>
            <h2>Further reading and practical resources</h2>
            <p>Selected resources related to this topic from PharmaCourse.</p>
          </div>

          <div className="blog-recommendation-strip" role="list" aria-label="Recommended resources">
            {recommendationItems.map((item) => (
              <div key={item.key} role="listitem" className="blog-recommendation-strip-item">
                <RecommendationTile
                  to={item.to}
                  image={item.image}
                  fallbackLabel={item.fallbackLabel}
                  fallbackStyle={item.fallbackStyle}
                  badge={item.badge}
                  meta={item.meta}
                  title={item.title}
                  description={item.description}
                  cta={item.cta}
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
