'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Post {
  id: string
  membership_number: string
  author_name: string
  author_school: string
  title: string
  description: string
  images: string[]
  upvotes: number
  downvotes: number
  comment_count: number
  hot_score: number
  status: 'active' | 'hidden' | 'deleted'
  created_at: string
}

interface Comment {
  id: string
  post_id: string
  parent_id: string | null
  membership_number: string
  author_name: string
  author_school: string
  content: string
  status: 'active' | 'hidden' | 'deleted'
  created_at: string
}

type Tab = 'posts' | 'comments'
type StatusFilter = 'all' | 'active' | 'hidden' | 'deleted'

export default function IdeaNetAdminPage() {
  const [tab, setTab] = useState<Tab>('posts')
  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [postComments, setPostComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, hidden: 0, deleted: 0, totalComments: 0 })

  useEffect(() => {
    if (tab === 'posts') loadPosts()
    else loadComments()
  }, [tab, statusFilter])

  const loadPosts = async () => {
    setLoading(true)
    let query = supabase
      .from('ideanet_posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query
    if (!error && data) {
      setPosts(data)
      // Get stats
      const { data: allData } = await supabase.from('ideanet_posts').select('status')
      const { count: commentCount } = await supabase.from('ideanet_comments').select('*', { count: 'exact', head: true })
      if (allData) {
        setStats({
          total: allData.length,
          active: allData.filter(p => p.status === 'active').length,
          hidden: allData.filter(p => p.status === 'hidden').length,
          deleted: allData.filter(p => p.status === 'deleted').length,
          totalComments: commentCount || 0
        })
      }
    }
    setLoading(false)
  }

  const loadComments = async () => {
    setLoading(true)
    let query = supabase
      .from('ideanet_comments')
      .select('*')
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query
    if (!error && data) setComments(data)
    setLoading(false)
  }

  const loadPostComments = async (post: Post) => {
    setSelectedPost(post)
    setLoadingComments(true)
    const { data } = await supabase
      .from('ideanet_comments')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    setPostComments(data || [])
    setLoadingComments(false)
  }

  const updatePostStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('ideanet_posts').update({ status }).eq('id', id)
    if (!error) {
      setPosts(prev => prev.map(p => p.id === id ? { ...p, status: status as Post['status'] } : p))
      if (selectedPost?.id === id) setSelectedPost(prev => prev ? { ...prev, status: status as Post['status'] } : prev)
    }
  }

  const updateCommentStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('ideanet_comments').update({ status }).eq('id', id)
    if (!error) {
      setComments(prev => prev.map(c => c.id === id ? { ...c, status: status as Comment['status'] } : c))
      setPostComments(prev => prev.map(c => c.id === id ? { ...c, status: status as Comment['status'] } : c))
    }
  }

  const filteredPosts = posts.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.author_name.toLowerCase().includes(search.toLowerCase()) ||
    p.membership_number.toLowerCase().includes(search.toLowerCase())
  )

  const filteredComments = comments.filter(c =>
    c.content.toLowerCase().includes(search.toLowerCase()) ||
    c.author_name.toLowerCase().includes(search.toLowerCase()) ||
    c.membership_number.toLowerCase().includes(search.toLowerCase())
  )

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, React.CSSProperties> = {
      active: { color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' },
      hidden: { color: '#f5c842', background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.2)' },
      deleted: { color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }
    }
    return (
      <span style={{ ...styles[status], padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {status}
      </span>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#111111', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          💡 IdeaNet Moderation
        </h1>
        <p style={{ color: '#6B6B6B', fontSize: '13px', margin: 0 }}>
          Review, hide, and manage student project idea posts and comments
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Total Posts', value: stats.total, color: '#111111' },
          { label: 'Active', value: stats.active, color: '#4ade80' },
          { label: 'Hidden', value: stats.hidden, color: '#f5c842' },
          { label: 'Deleted', value: stats.deleted, color: '#f87171' },
          { label: 'Comments', value: stats.totalComments, color: 'rgba(255,255,255,0.6)' }
        ].map(stat => (
          <div key={stat.label} style={{ background: '#0b0b0b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px 20px' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', margin: '0 0 8px', textTransform: 'uppercase' }}>{stat.label}</p>
            <p style={{ fontSize: '24px', fontWeight: '800', color: stat.color, margin: 0 }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid #E8E8E8', borderRadius: '10px', padding: '4px', gap: '4px' }}>
          {(['posts', 'comments'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSearch(''); setStatusFilter('active'); setSelectedPost(null) }}
              style={{
                padding: '8px 20px',
                background: tab === t ? '#E8E8E8' : 'transparent',
                border: tab === t ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
                borderRadius: '8px', color: tab === t ? '#fff' : '#6B6B6B',
                fontSize: '13px', fontWeight: tab === t ? '600' : '400', cursor: 'pointer',
                transition: 'all 0.15s ease', textTransform: 'capitalize'
              }}
            >{t}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(['all', 'active', 'hidden', 'deleted'] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '7px 14px',
                background: statusFilter === s ? '#E8E8E8' : 'transparent',
                border: `1px solid ${statusFilter === s ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '8px', color: statusFilter === s ? '#fff' : '#6B6B6B',
                fontSize: '12px', fontWeight: statusFilter === s ? '600' : '400', cursor: 'pointer',
                transition: 'all 0.15s ease', textTransform: 'capitalize'
              }}
            >{s}</button>
          ))}
        </div>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${tab}...`}
          style={{
            flex: 1, minWidth: '200px', padding: '9px 16px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid #E8E8E8',
            borderRadius: '10px', color: '#111111', fontSize: '13px', outline: 'none'
          }}
        />
      </div>

      {/* Content area */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedPost ? '1fr 1fr' : '1fr', gap: '20px' }}>

        {/* Posts / Comments list */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Loading...</div>
          ) : tab === 'posts' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredPosts.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '40px', fontSize: '13px' }}>No posts found</p>
              ) : filteredPosts.map(post => (
                <div
                  key={post.id}
                  style={{
                    background: selectedPost?.id === post.id ? 'rgba(255,255,255,0.04)' : '#0b0b0b',
                    border: `1px solid ${selectedPost?.id === post.id ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: '12px', padding: '16px 20px', cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => loadPostComments(post)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ color: '#111111', fontSize: '14px', fontWeight: '700', margin: '0 0 4px', lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {post.title}
                      </h3>
                      <p style={{ color: '#6B6B6B', fontSize: '12px', margin: 0 }}>
                        {post.author_name}
                        {post.author_school && ` · ${post.author_school}`}
                        {' · '}{post.membership_number}
                      </p>
                    </div>
                    {statusBadge(post.status)}
                  </div>

                  <p style={{ color: '#6B6B6B', fontSize: '12px', margin: '0 0 12px', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {post.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>▲ {post.upvotes - post.downvotes} votes</span>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>💬 {post.comment_count}</span>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>{timeAgo(post.created_at)}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                      {post.status !== 'active' && (
                        <button
                          onClick={() => updatePostStatus(post.id, 'active')}
                          style={{ padding: '5px 12px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '6px', color: '#4ade80', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                        >Restore</button>
                      )}
                      {post.status === 'active' && (
                        <button
                          onClick={() => updatePostStatus(post.id, 'hidden')}
                          style={{ padding: '5px 12px', background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.2)', borderRadius: '6px', color: '#f5c842', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                        >Hide</button>
                      )}
                      {post.status !== 'deleted' && (
                        <button
                          onClick={() => { if (confirm('Permanently delete this post?')) updatePostStatus(post.id, 'deleted') }}
                          style={{ padding: '5px 12px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '6px', color: '#f87171', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                        >Delete</button>
                      )}
                    </div>
                  </div>

                  {post.images?.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                      {post.images.map((img, i) => (
                        <img key={i} src={img} alt="" style={{ width: '60px', height: '45px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #E8E8E8' }} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Comments tab */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredComments.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '40px', fontSize: '13px' }}>No comments found</p>
              ) : filteredComments.map(comment => (
                <div
                  key={comment.id}
                  style={{
                    background: '#0b0b0b', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '12px', padding: '16px 20px', transition: 'border-color 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.6)' }}>{comment.author_name}</span>
                      {comment.author_school && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>· {comment.author_school}</span>}
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.15)' }}>· {comment.membership_number}</span>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.15)' }}>· {timeAgo(comment.created_at)}</span>
                      {comment.parent_id && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px' }}>reply</span>}
                    </div>
                    {statusBadge(comment.status)}
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', lineHeight: '1.65', margin: '0 0 12px' }}>{comment.content}</p>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {comment.status !== 'active' && (
                      <button
                        onClick={() => updateCommentStatus(comment.id, 'active')}
                        style={{ padding: '5px 12px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '6px', color: '#4ade80', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                      >Restore</button>
                    )}
                    {comment.status === 'active' && (
                      <button
                        onClick={() => updateCommentStatus(comment.id, 'hidden')}
                        style={{ padding: '5px 12px', background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.2)', borderRadius: '6px', color: '#f5c842', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                      >Hide</button>
                    )}
                    {comment.status !== 'deleted' && (
                      <button
                        onClick={() => updateCommentStatus(comment.id, 'deleted')}
                        style={{ padding: '5px 12px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '6px', color: '#f87171', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                      >Delete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Post detail panel — shown when a post is selected in the posts tab */}
        {selectedPost && tab === 'posts' && (
          <div style={{ position: 'sticky', top: '20px', alignSelf: 'flex-start' }}>
            <div style={{ background: '#0b0b0b', border: '1px solid #E8E8E8', borderRadius: '14px', overflow: 'hidden' }}>
              {/* Detail header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ color: '#111111', fontSize: '13px', fontWeight: '700', margin: 0 }}>Post Detail</h4>
                <button
                  onClick={() => setSelectedPost(null)}
                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '6px', color: 'rgba(255,255,255,0.5)', width: '28px', height: '28px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >×</button>
              </div>

              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  {statusBadge(selectedPost.status)}
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>{selectedPost.membership_number}</span>
                </div>
                <h3 style={{ color: '#111111', fontSize: '16px', fontWeight: '700', margin: '0 0 10px', lineHeight: '1.3' }}>{selectedPost.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', lineHeight: '1.75', margin: '0 0 14px' }}>{selectedPost.description}</p>

                {selectedPost.images?.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    {selectedPost.images.map((img, i) => (
                      <img key={i} src={img} alt="" style={{ width: '90px', height: '68px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #E8E8E8' }} />
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                  {selectedPost.status !== 'active' && (
                    <button
                      onClick={() => updatePostStatus(selectedPost.id, 'active')}
                      style={{ padding: '7px 14px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '8px', color: '#4ade80', fontSize: '12px', fontWeight: '600', cursor: 'pointer', flex: 1 }}
                    >✓ Restore</button>
                  )}
                  {selectedPost.status === 'active' && (
                    <button
                      onClick={() => updatePostStatus(selectedPost.id, 'hidden')}
                      style={{ padding: '7px 14px', background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.2)', borderRadius: '8px', color: '#f5c842', fontSize: '12px', fontWeight: '600', cursor: 'pointer', flex: 1 }}
                    >◎ Hide</button>
                  )}
                  {selectedPost.status !== 'deleted' && (
                    <button
                      onClick={() => { if (confirm('Delete post?')) updatePostStatus(selectedPost.id, 'deleted') }}
                      style={{ padding: '7px 14px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', color: '#f87171', fontSize: '12px', fontWeight: '600', cursor: 'pointer', flex: 1 }}
                    >✕ Delete</button>
                  )}
                </div>

                {/* Comments for this post */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                  <p style={{ fontSize: '10px', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', margin: '0 0 14px', textTransform: 'uppercase' }}>
                    Comments ({postComments.length})
                  </p>
                  {loadingComments ? (
                    <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>Loading comments...</p>
                  ) : postComments.length === 0 ? (
                    <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>No comments</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                      {postComments.map(c => (
                        <div key={c.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.55)' }}>{c.author_name}</span>
                              {c.parent_id && <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.04)', padding: '2px 5px', borderRadius: '3px' }}>reply</span>}
                              {statusBadge(c.status)}
                            </div>
                          </div>
                          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', lineHeight: '1.6', margin: '0 0 8px' }}>{c.content}</p>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {c.status !== 'active' && (
                              <button onClick={() => updateCommentStatus(c.id, 'active')} style={{ padding: '3px 10px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '4px', color: '#4ade80', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}>Restore</button>
                            )}
                            {c.status === 'active' && (
                              <button onClick={() => updateCommentStatus(c.id, 'hidden')} style={{ padding: '3px 10px', background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.2)', borderRadius: '4px', color: '#f5c842', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}>Hide</button>
                            )}
                            {c.status !== 'deleted' && (
                              <button onClick={() => updateCommentStatus(c.id, 'deleted')} style={{ padding: '3px 10px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '4px', color: '#f87171', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}>Delete</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
