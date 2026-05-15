import { Eye, Heart } from "lucide-react"
import { formatBlogEngagementCount } from "../lib/blogEngagement"
import "./BlogEngagementStats.css"

export default function BlogEngagementStats({
  viewCount = 0,
  likeCount = 0,
  viewerLiked = false,
  className = "",
}) {
  const classes = ["blog-engagement-stats", className].filter(Boolean).join(" ")

  return (
    <div className={classes} aria-label={`This article has ${viewCount} views and ${likeCount} likes`}>
      <span className="blog-engagement-pill">
        <Eye size={14} aria-hidden="true" />
        {formatBlogEngagementCount(viewCount)} views
      </span>
      <span className={`blog-engagement-pill${viewerLiked ? " liked" : ""}`}>
        <Heart size={14} aria-hidden="true" />
        {formatBlogEngagementCount(likeCount)} likes
      </span>
    </div>
  )
}
