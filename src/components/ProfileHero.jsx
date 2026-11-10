import { Avatar } from './UserMenu.jsx'

function hostOf(url) {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Top of a photographer page: big picture, name, tagline, bio and links. Used on the public page and in the editor preview. */
export default function ProfileHero({ profile }) {
  const { name, tagline, bio, website, picture } = profile
  return (
    <header className="profile-hero">
      <span className="profile-avatar">
        <Avatar user={{ name, email: name, picture }} size={132} />
      </span>
      <div className="profile-text">
        <h1>{name || 'Your name'}</h1>
        {tagline && <p className="profile-tagline">{tagline}</p>}
        {bio && <p className="profile-bio">{bio}</p>}
        {website && (
          <div className="profile-links">
            {website && <a className="chip" href={website} target="_blank" rel="noreferrer noopener">{hostOf(website)}</a>}
          </div>
        )}
      </div>
    </header>
  )
}
