import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { supabase } from "../lib/supabaseClient"
import SEO from "../components/SEO"
import Pagination from "../components/Pagination"
import BlogEngagementStats from "../components/BlogEngagementStats"
import { formatBlogDate, getBlogCategoryLabel, getBlogCoverFallback, getBlogExcerpt, stripHtmlContent, trimExcerptToWordCount } from "../lib/blogHelpers"
import "./Blog.css"

const BLOG_PAGE_SIZE = 6

function BlogCard({ post }) {
  const categoryLabel = getBlogCategoryLabel(post.category)
  const cardExcerpt = trimExcerptToWordCount(getBlogExcerpt(post), 67)

  return (
    <Link to={`/blog/${post.slug}`} className="card blog-card">
      {post.cover_image_url ? (
        <img src={post.cover_image_url} alt={post.title} className="blog-card-cover" />
      ) : (
        <div className="blog-card-cover-fallback" style={{ background: getBlogCoverFallback(post.category) }}>
          <span>{categoryLabel}</span>
        </div>
      )}

      <div className="blog-card-body">
        <div className="blog-card-meta">
          <span className="blog-category-badge">{categoryLabel}</span>
          <span>{formatBlogDate(post.published_at || post.created_at)}</span>
        </div>

        <h2>{post.title}</h2>
        <p className="blog-card-excerpt">{cardExcerpt}</p>

        <BlogEngagementStats
          className="blog-card-stats"
          viewCount={post.view_count}
          likeCount={post.like_count}
        />

        <div className="blog-card-footer">
          <span className="blog-card-author">{post.author_name || "PharmaCourse Team"}</span>
          <span>Read article</span>
        </div>
      </div>
    </Link>
  )
}

export default function Blog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [posts, setPosts] = useState([])
  const [categoryOptions, setCategoryOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState(() => getBlogCategoryLabel(searchParams.get("category")) || "All")
  const [currentPage, setCurrentPage] = useState(1)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    loadPosts()
  }, [])

  async function loadPosts() {
    setLoading(true)
    setErrorMessage("")

    const [postsResponse, categoriesResponse] = await Promise.all([
      supabase
        .from("blog_posts")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false }),
      supabase
        .from("blog_categories")
        .select("name")
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ])

    if (postsResponse.error) {
      console.error("Failed to load blog posts:", postsResponse.error)
      setPosts([])
      setCategoryOptions([])
      setErrorMessage("We could not load blog posts right now. Please try again shortly.")
    } else {
      const nextPosts = postsResponse.data || []
      setPosts(nextPosts)
      setCategoryOptions(
        categoriesResponse.error
          ? []
          : (categoriesResponse.data || [])
            .map((category) => getBlogCategoryLabel(category.name))
            .filter(Boolean)
      )
    }

    setLoading(false)
  }

  const categories = useMemo(() => {
    const activeCategories = categoryOptions.filter(Boolean)
    const publishedCategories = Array.from(
      new Set(posts.map((post) => getBlogCategoryLabel(post.category)).filter(Boolean))
    )

    const uniqueCategories = Array.from(new Set([...activeCategories, ...publishedCategories]))
      .sort((first, second) => first.localeCompare(second))

    return ["All", ...uniqueCategories]
  }, [categoryOptions, posts])

  useEffect(() => {
    if (!categories.includes(activeCategory)) {
      setActiveCategory("All")
    }
  }, [activeCategory, categories])

  useEffect(() => {
    const nextCategory = getBlogCategoryLabel(searchParams.get("category")) || "All"

    if (nextCategory === activeCategory) return
    if (nextCategory !== "All" && !categories.includes(nextCategory)) return

    setActiveCategory(nextCategory)
  }, [activeCategory, categories, searchParams])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeCategory, searchQuery])

  const filteredPosts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return posts.filter((post) => {
      const categoryLabel = getBlogCategoryLabel(post.category)
      const matchesCategory = activeCategory === "All" || categoryLabel === activeCategory
      const haystack = [post.title, post.excerpt, stripHtmlContent(post.content), post.author_name, categoryLabel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      const matchesSearch = haystack.includes(normalizedQuery)

      return matchesCategory && matchesSearch
    })
  }, [activeCategory, posts, searchQuery])

  const totalPages = Math.ceil(filteredPosts.length / BLOG_PAGE_SIZE)

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * BLOG_PAGE_SIZE
    return filteredPosts.slice(startIndex, startIndex + BLOG_PAGE_SIZE)
  }, [currentPage, filteredPosts])

  function handleCategorySelect(category) {
    setActiveCategory(category)
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams)

      if (category === "All") {
        nextParams.delete("category")
      } else {
        nextParams.set("category", category)
      }

      return nextParams
    })
  }

  return (
    <div className="page blog-page">
      <SEO
        title="Blog"
        description="Insights, practical guidance, and pharmacy operations articles from the PharmaCourse team."
        path="/blog"
        type="website"
      />

      <div className="container-wide blog-page-shell">
        <div className="card blog-toolbar">
          <div className="blog-toolbar-head">
            <div className="blog-toolbar-copy">
              <h1>PharmaCourse Blog</h1>
              <p>Practical insights on pharmacy practice, healthcare operations, and professional learning.</p>
            </div>
          </div>

          <div className="blog-toolbar-row">
            <div className="blog-filter-group">
              <span className="blog-filter-label">Categories</span>
              <div className="blog-filter-tabs" role="tablist" aria-label="Blog categories">
                {categories.map((category) => {
                  const isActive = activeCategory === category
                  return (
                    <button
                      key={category}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`btn ${isActive ? "btn-primary" : "btn-outline"}`}
                      onClick={() => handleCategorySelect(category)}
                    >
                      {category}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="blog-search-group">
              <label htmlFor="blog-search" className="blog-filter-label">Search articles</label>
              <input
                id="blog-search"
                type="search"
                className="blog-search-input"
                placeholder="Search by title, topic, or author"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>

          <p className="blog-toolbar-summary">
            Showing {filteredPosts.length} of {posts.length} published articles
          </p>
        </div>

        {loading ? (
          <div className="card blog-empty-state">
            <p>Loading articles...</p>
          </div>
        ) : errorMessage ? (
          <div className="card blog-empty-state">
            <p>{errorMessage}</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="card blog-empty-state">
            <p>No articles match your filters right now.</p>
          </div>
        ) : (
          <>
            <div className="blog-grid">
              {paginatedPosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredPosts.length}
              pageSize={BLOG_PAGE_SIZE}
              onPageChange={setCurrentPage}
              label="articles"
            />
          </>
        )}
      </div>
    </div>
  )
}
